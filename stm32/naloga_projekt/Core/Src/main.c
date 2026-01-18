/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * @file           : main.c
  *
  *
  ******************************************************************************
  */
/* USER CODE END Header */

/* Includes ------------------------------------------------------------------*/
#include "main.h"
#include "usb_device.h"

/* USER CODE BEGIN Includes */
#include "usbd_cdc_if.h"
#include <stdio.h>
#include <string.h>
#include <math.h>
#include <stdbool.h>
/* USER CODE END Includes */

/* Private define ------------------------------------------------------------*/

#define ESP_CFG_AP_SSID "STM32_CFG"
#define ESP_CFG_AP_PASS "12345678"
#define ESP_CFG_PORT 8080
#define ESP_CFG_TIMEOUT  300000

#define GYRO_SENS_500DPS  (0.0175f)

#define WIFI_SSID "7C5E04"
#define WIFI_PASS "erikSmrdi"

#define TCP_SERVER_IP "172.20.10.2"
#define TCP_SERVER_PORT 9000

#define SEND_EVERY_MS 50

I2C_HandleTypeDef hi2c1;
SPI_HandleTypeDef hspi1;
TIM_HandleTypeDef htim2;
UART_HandleTypeDef huart2;

/* USER CODE BEGIN PV */
volatile uint8_t gyro_data_ready = 0;
volatile uint32_t gyro_packet_counter = 0;

float gyro_bias_x = 0.0f;
float gyro_bias_y = 0.0f;
float gyro_bias_z = 0.0f;

#define ESP_RX_BUF_SIZE 1024
static volatile uint16_t esp_rx_w = 0;
static volatile uint16_t esp_rx_r = 0;
static uint8_t esp_rx_buf[ESP_RX_BUF_SIZE];
static uint8_t esp_rx_byte = 0;

static bool esp_ready = false;
static bool wifi_joined = false;
static bool tcp_connected = false;
static char active_tcp_ip[32] = TCP_SERVER_IP;


/* USER CODE END PV */

void SystemClock_Config(void);
static void MX_GPIO_Init(void);
static void MX_I2C1_Init(void);
static void MX_SPI1_Init(void);
static void MX_TIM2_Init(void);
static void MX_USART2_UART_Init(void);

/* USER CODE BEGIN PFP */
static void pavza(void);
uint8_t spi1_beriRegister(uint8_t reg);
void spi1_beriRegistre(uint8_t reg, uint8_t* buffer, uint8_t size);
void spi1_pisiRegister(uint8_t reg, uint8_t value);
void initL3GD20(void);
void Gyro_CalculateBias(void);

static void CDC_SendString(const char *s);

static void ESP_StartRxIT(void);
static void ESP_RxPush(uint8_t b);
static int  ESP_RxPop(void);
static void ESP_RxClear(void);

static void ESP_SendRaw(const char *s);
static void ESP_SendLine(const char *cmd);
static bool ESP_WaitFor(const char *needle, uint32_t timeout_ms);

static bool ESP_SendCmdWaitOK(const char *cmd, uint32_t timeout_ms);
static bool ESP_InitSequence(void);
static bool ESP_JoinWiFi(const char *ssid, const char *pass);
static bool ESP_OpenTCP(const char *ip, int port);
static bool ESP_SendTCP(const char *payload, uint32_t timeout_ms);

static bool ESP_StartConfigServer(void);
static bool ESP_ReadSetWifi(char *ssid, char *pass, char *ip, uint32_t timeout_ms);
static bool ESP_SendToConn(int id, const char *payload, uint32_t timeout_ms);


/* USER CODE END PFP */

/* USER CODE BEGIN 0 */

static void pavza(void){
  for(volatile uint32_t i=0;i<600;i++) __asm("nop");
}


uint8_t spi1_beriRegister(uint8_t reg)
{
  uint16_t buf_out = 0, buf_in = 0;
  reg |= 0x80;
  buf_out = reg;

  HAL_GPIO_WritePin(GPIOE, GPIO_PIN_3, GPIO_PIN_RESET);
  pavza();

  HAL_SPI_TransmitReceive(&hspi1, (uint8_t*)&buf_out, (uint8_t*)&buf_in, 2, HAL_MAX_DELAY);

  HAL_GPIO_WritePin(GPIOE, GPIO_PIN_3, GPIO_PIN_SET);
  pavza();

  return (uint8_t)(buf_in >> 8);
}

void spi1_pisiRegister(uint8_t reg, uint8_t value)
{
  uint16_t buf_out = reg | (value << 8);

  HAL_GPIO_WritePin(GPIOE, GPIO_PIN_3, GPIO_PIN_RESET);
  pavza();

  HAL_SPI_Transmit(&hspi1, (uint8_t*)&buf_out, 2, HAL_MAX_DELAY);

  HAL_GPIO_WritePin(GPIOE, GPIO_PIN_3, GPIO_PIN_SET);
  pavza();
}

void spi1_beriRegistre(uint8_t reg, uint8_t* buffer, uint8_t size)
{
  reg |= 0xC0;

  HAL_GPIO_WritePin(GPIOE, GPIO_PIN_3, GPIO_PIN_RESET);
  pavza();

  HAL_SPI_Transmit(&hspi1, &reg, 1, HAL_MAX_DELAY);
  HAL_SPI_Receive(&hspi1, buffer, size, HAL_MAX_DELAY);

  HAL_GPIO_WritePin(GPIOE, GPIO_PIN_3, GPIO_PIN_SET);
  pavza();
}

void initL3GD20(void)
{
  uint8_t who = spi1_beriRegister(0x0F);
  if (who != 0xD4 && who != 0xD3) {
      while(1){
        HAL_GPIO_TogglePin(GPIOE, GPIO_PIN_13);
        HAL_Delay(200);
      }
  }

  spi1_pisiRegister(0x20, 0x6F);
  spi1_pisiRegister(0x23, 0x10);
  spi1_pisiRegister(0x22, 0x08);
}

void HAL_GPIO_EXTI_Callback(uint16_t GPIO_Pin)
{
  if(GPIO_Pin == GPIO_PIN_1) {
    gyro_data_ready = 1;
  }
}

void Gyro_CalculateBias(void)
{
  uint8_t raw[6];
  float sx=0, sy=0, sz=0;
  uint32_t n=0;

  __HAL_TIM_SET_COUNTER(&htim2, 0);
  HAL_TIM_Base_Start(&htim2);

  HAL_GPIO_WritePin(GPIOE, LD4_Pin, GPIO_PIN_SET);

  while(__HAL_TIM_GET_COUNTER(&htim2) < 29170U)
  {
    if(gyro_data_ready){
      gyro_data_ready = 0;
      spi1_beriRegistre(0x28, raw, 6);

      int16_t gx = (int16_t)((raw[1]<<8)|raw[0]);
      int16_t gy = (int16_t)((raw[3]<<8)|raw[2]);
      int16_t gz = (int16_t)((raw[5]<<8)|raw[4]);

      sx += gx * GYRO_SENS_500DPS;
      sy += gy * GYRO_SENS_500DPS;
      sz += gz * GYRO_SENS_500DPS;
      n++;
    }
  }

  HAL_TIM_Base_Stop(&htim2);
  HAL_GPIO_WritePin(GPIOE, LD4_Pin, GPIO_PIN_RESET);

  if(n){
    gyro_bias_x = sx/(float)n;
    gyro_bias_y = sy/(float)n;
    gyro_bias_z = sz/(float)n;
  } else {
    gyro_bias_x = gyro_bias_y = gyro_bias_z = 0.0f;
  }

  gyro_packet_counter = 0;
}


static void CDC_SendString(const char *s)
{
  uint16_t len = (uint16_t)strlen(s);
  while(CDC_Transmit_FS((uint8_t*)s, len) == USBD_BUSY) {}
}


static void ESP_StartRxIT(void)
{
  HAL_UART_Receive_IT(&huart2, &esp_rx_byte, 1);
}

void HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart)
{
  if (huart->Instance == USART2)
  {
    ESP_RxPush(esp_rx_byte);

    HAL_GPIO_TogglePin(GPIOE, GPIO_PIN_13);

    HAL_UART_Receive_IT(&huart2, &esp_rx_byte, 1);
  }
}


static void ESP_RxPush(uint8_t b)
{
  uint16_t next = (uint16_t)((esp_rx_w + 1) % ESP_RX_BUF_SIZE);
  if(next != esp_rx_r) {
    esp_rx_buf[esp_rx_w] = b;
    esp_rx_w = next;
  }
}

static int ESP_RxPop(void)
{
  if(esp_rx_r == esp_rx_w) return -1;
  uint8_t b = esp_rx_buf[esp_rx_r];
  esp_rx_r = (uint16_t)((esp_rx_r + 1) % ESP_RX_BUF_SIZE);
  return (int)b;
}

static void ESP_RxClear(void)
{
  esp_rx_r = esp_rx_w = 0;
}


static void ESP_SendRaw(const char *s)
{
  HAL_UART_Transmit(&huart2, (uint8_t*)s, (uint16_t)strlen(s), HAL_MAX_DELAY);
}

static void ESP_SendLine(const char *cmd)
{
  ESP_SendRaw(cmd);
  ESP_SendRaw("\r\n");
}

static bool ESP_WaitFor(const char *needle, uint32_t timeout_ms)
{
  uint32_t t0 = HAL_GetTick();
  char acc[256];
  size_t pos = 0;
  memset(acc, 0, sizeof(acc));

  while ((HAL_GetTick() - t0) < timeout_ms)
  {
    int v = ESP_RxPop();
    if (v < 0) { HAL_Delay(1); continue; }

    acc[pos++] = (char)v;
    if (pos >= sizeof(acc) - 1)
    {
      memmove(acc, acc + 128, 128);
      pos = 128;
      acc[pos] = '\0';
    }
    acc[pos] = '\0';

    if (strstr(acc, needle) != NULL) return true;
  }
  return false;
}

static bool ESP_SendCmdWaitOK(const char *cmd, uint32_t timeout_ms)
{
  ESP_RxClear();
  ESP_SendLine(cmd);

  if (ESP_WaitFor("OK", timeout_ms)) return true;

  if (ESP_WaitFor("ERROR", 50)) return false;

  return false;
}



static bool ESP_InitSequence(void)
{
  for (int i = 0; i < 5; i++)
  {
    if (ESP_SendCmdWaitOK("AT", 800)) {
      ESP_SendCmdWaitOK("ATE0", 800);

      if (!ESP_SendCmdWaitOK("AT+CWMODE=1", 1500)) return false;

      return true;
    }
    HAL_Delay(200);
  }
  return false;
}


static bool ESP_JoinWiFi(const char *ssid, const char *pass)
{
  char cmd[256];
  snprintf(cmd, sizeof(cmd), "AT+CWJAP=\"%s\",\"%s\"", ssid, pass);

  ESP_RxClear();
  ESP_SendLine(cmd);

  if(!ESP_WaitFor("OK\r\n", 20000)) return false;
  return true;
}

static bool ESP_OpenTCP(const char *ip, int port)
{
  char cmd[128];
  snprintf(cmd, sizeof(cmd), "AT+CIPSTART=\"TCP\",\"%s\",%d", ip, port);

  ESP_RxClear();
  ESP_SendLine(cmd);

  uint32_t t0 = HAL_GetTick();
  char acc[512];
  size_t pos = 0;
  memset(acc, 0, sizeof(acc));

  while ((HAL_GetTick() - t0) < 12000)
  {
    int v = ESP_RxPop();
    if (v < 0) { HAL_Delay(1); continue; }

    if (pos < sizeof(acc) - 1) acc[pos++] = (char)v;
    acc[pos] = 0;

    if (strstr(acc, "ERROR") || strstr(acc, "FAIL")) {
      CDC_SendString("CIPSTART RESP:\r\n");
      CDC_SendString(acc);
      CDC_SendString("\r\n");
      return false;
    }


    if (strstr(acc, "ALREADY CONNECTED")) return true;
    if (strstr(acc, "CONNECT")) return true;

    if (strstr(acc, "OK\r\n")) {
    }
  }

  return false;
}



static bool ESP_SendTCP(const char *payload, uint32_t timeout_ms)
{
  const int len = (int)strlen(payload);
  char cmd[64];

  ESP_RxClear();
  snprintf(cmd, sizeof(cmd), "AT+CIPSEND=%d", len);
  ESP_SendLine(cmd);

  if(!ESP_WaitFor(">", 3000)) return false;

  ESP_SendRaw(payload);

  if(!ESP_WaitFor("SEND OK\r\n", timeout_ms)) return false;
  return true;
}



static bool ESP_StartConfigServer(void)
{
  char cmd[128];

  if(!ESP_SendCmdWaitOK("AT+CWMODE=3", 2000)) return false;

  snprintf(cmd, sizeof(cmd),
           "AT+CWSAP=\"%s\",\"%s\",5,3",
           ESP_CFG_AP_SSID, ESP_CFG_AP_PASS);
  if(!ESP_SendCmdWaitOK(cmd, 4000)) return false;

  if(!ESP_SendCmdWaitOK("AT+CIPMUX=1", 2000)) return false;

  ESP_SendCmdWaitOK("AT+CIPDINFO=0", 2000);

  snprintf(cmd, sizeof(cmd), "AT+CIPSERVER=1,%d", ESP_CFG_PORT);
  if(!ESP_SendCmdWaitOK(cmd, 2000)) return false;

  return true;
}



static bool ESP_ReadSetWifi(char *ssid, char *pass, char *ip, uint32_t timeout_ms)
{
  uint32_t t0 = HAL_GetTick();

  static char stream[768];
  int sp = 0;
  memset(stream, 0, sizeof(stream));

  while ((HAL_GetTick() - t0) < timeout_ms)
  {
    int c = ESP_RxPop();
    if (c < 0) { HAL_Delay(1); continue; }

    if (sp < (int)sizeof(stream) - 1)
      stream[sp++] = (char)c;
    stream[sp] = 0;

    char *ipd = strstr(stream, "+IPD,");
    if (!ipd) continue;

    char *p = ipd + 5;
    int id = (int)strtol(p, &p, 10);
    if (*p != ',') continue;
    p++;

    int len = (int)strtol(p, &p, 10);
    char *colon = strchr(p, ':');
    if (!colon) continue;

    char *payload = colon + 1;
    if ((stream + sp - payload) < len) continue;

    char data[256];
    int copyLen = (len < 255) ? len : 255;
    memcpy(data, payload, copyLen);
    data[copyLen] = 0;

    for (int i = 0; data[i]; i++)
      if (data[i] == '\r' || data[i] == '\n') { data[i] = 0; break; }

    if (strncmp(data, "SETWIFI:ssid=", 13) != 0)
      continue;

    char *s = data + 13;
    char *pp = strstr(s, ";pass=");
    char *pi = strstr(s, ";ip=");

    if (!pp || !pi)
      continue;

    *pp = 0;
    *pi = 0;

    strncpy(ssid, s, 63);
    strncpy(pass, pp + 6, 63);
    strncpy(ip,   pi + 4, 31);

    ssid[63] = pass[63] = ip[31] = 0;

    CDC_SendString("[USB] CFG: SSID/PASS/IP parsed OK\r\n");
    ESP_SendToConn(id, "OK\r\n", 3000);

    return true;
  }

  return false;
}


static bool ESP_SendToConn(int id, const char *payload, uint32_t timeout_ms)
{
  int len = (int)strlen(payload);
  char cmd[64];

  ESP_RxClear();
  snprintf(cmd, sizeof(cmd), "AT+CIPSEND=%d,%d", id, len);
  ESP_SendLine(cmd);

  if(!ESP_WaitFor(">", 3000)) return false;

  ESP_SendRaw(payload);

  if(!ESP_WaitFor("SEND OK\r\n", timeout_ms)) return false;
  return true;
}

/* USER CODE END 0 */


int main(void)
{
  HAL_Init();
  SystemClock_Config();

  MX_GPIO_Init();
  MX_I2C1_Init();
  MX_SPI1_Init();
  MX_USB_DEVICE_Init();
  MX_TIM2_Init();
  MX_USART2_UART_Init();

  __HAL_SPI_ENABLE(&hspi1);
  HAL_GPIO_WritePin(GPIOE, GPIO_PIN_3, GPIO_PIN_SET);

  initL3GD20();
  Gyro_CalculateBias();

  CDC_SendString("\r\n STM32 start\r\n");

  ESP_StartRxIT();
  HAL_Delay(2000);

  CDC_SendString("ESP init...\r\n");
  esp_ready = ESP_InitSequence();

  if (!esp_ready)
  {
    CDC_SendString("ESP init FAILED\r\n");
    while (1);
  }

  CDC_SendString("ESP init OK\r\n");


  char active_ssid[64] = WIFI_SSID;
  char active_pass[64] = WIFI_PASS;

  CDC_SendString("Starting ESP CONFIG server...\r\n");

  if (ESP_StartConfigServer())
  {
    CDC_SendString("AP:STM32_CFG  PASS: 12345678\r\n");
    CDC_SendString("Send: SETWIFI:ssid=XXX;pass=YYY\r\n");

    if (ESP_ReadSetWifi(active_ssid, active_pass, active_tcp_ip, ESP_CFG_TIMEOUT))
    {
      CDC_SendString("New WiFi credentials received\r\n");
    }
    else
    {
      CDC_SendString("Config timeout -> using default WiFi\r\n");
    }

    CDC_SendString("Stopping CONFIG AP...\r\n");

    ESP_SendCmdWaitOK("AT+CIPSERVER=0", 2000);
    ESP_SendCmdWaitOK("AT+CIPMUX=0", 2000);

    /* HARD WiFi reset */
    ESP_SendCmdWaitOK("AT+CWQAP", 2000);
    ESP_SendCmdWaitOK("AT+CWMODE=1", 2000);

    HAL_Delay(2000);
  }
  else
  {
    CDC_SendString("Config server FAILED -> using default WiFi\r\n");
  }


  CDC_SendString("Joining target WiFi...\r\n");

  wifi_joined = ESP_JoinWiFi(active_ssid, active_pass);

  if (!wifi_joined)
  {
    CDC_SendString("WiFi join FAILED\r\n");
    while (1);
  }

  CDC_SendString("WiFi join OK\r\n");


  CDC_SendString(
    "PLEASE switch PC to target WiFi now\r\n"
    "Waiting before TCP...\r\n"
  );

  HAL_Delay(30000);



  tcp_connected = false;

  for (int i = 0; i < 10; i++)
  {
    CDC_SendString("Opening TCP...\r\n");

    if (ESP_OpenTCP(active_tcp_ip, TCP_SERVER_PORT))
    {
      CDC_SendString("TCP open OK\r\n");
      tcp_connected = true;
      break;
    }

    CDC_SendString("TCP failed, retry...\r\n");
    HAL_Delay(5000);
  }

  if (!tcp_connected)
  {
    CDC_SendString("TCP permanently failed\r\n");
  }


  uint8_t raw[6];
  char json[160];
  uint32_t last_send = HAL_GetTick();

  while (1)
  {
    if (gyro_data_ready)
    {
      gyro_data_ready = 0;

      spi1_beriRegistre(0x28, raw, 6);

      int16_t gx = (int16_t)((raw[1] << 8) | raw[0]);
      int16_t gy = (int16_t)((raw[3] << 8) | raw[2]);
      int16_t gz = (int16_t)((raw[5] << 8) | raw[4]);

      float fx = gx * GYRO_SENS_500DPS - gyro_bias_x;
      float fy = gy * GYRO_SENS_500DPS - gyro_bias_y;
      float fz = gz * GYRO_SENS_500DPS - gyro_bias_z;

      uint32_t now = HAL_GetTick();
      if (now - last_send >= SEND_EVERY_MS)
      {
        last_send = now;
        gyro_packet_counter++;

        snprintf(json, sizeof(json),
          "{\"id\":%lu,\"x\":%.3f,\"y\":%.3f,\"z\":%.3f}\r\n",
          (unsigned long)gyro_packet_counter, fx, fy, fz);

        CDC_SendString(json);

        if (!ESP_SendTCP(json, 5000))
        {
          CDC_SendString("TCP send failed -> reconnect\r\n");

          ESP_SendCmdWaitOK("AT+CIPCLOSE", 2000);
          HAL_Delay(500);

          tcp_connected = ESP_OpenTCP(active_tcp_ip, TCP_SERVER_PORT);
        }

      }
    }
  }
}


/**
  * @brief System Clock Configuration
  * @retval None
  */
void SystemClock_Config(void)
{
  RCC_OscInitTypeDef RCC_OscInitStruct = {0};
  RCC_ClkInitTypeDef RCC_ClkInitStruct = {0};
  RCC_PeriphCLKInitTypeDef PeriphClkInit = {0};

  /** Initializes the RCC Oscillators according to the specified parameters
  * in the RCC_OscInitTypeDef structure.
  */
  RCC_OscInitStruct.OscillatorType = RCC_OSCILLATORTYPE_HSI|RCC_OSCILLATORTYPE_HSE;
  RCC_OscInitStruct.HSEState = RCC_HSE_BYPASS;
  RCC_OscInitStruct.HSEPredivValue = RCC_HSE_PREDIV_DIV1;
  RCC_OscInitStruct.HSIState = RCC_HSI_ON;
  RCC_OscInitStruct.HSICalibrationValue = RCC_HSICALIBRATION_DEFAULT;
  RCC_OscInitStruct.PLL.PLLState = RCC_PLL_ON;
  RCC_OscInitStruct.PLL.PLLSource = RCC_PLLSOURCE_HSE;
  RCC_OscInitStruct.PLL.PLLMUL = RCC_PLL_MUL9;
  if (HAL_RCC_OscConfig(&RCC_OscInitStruct) != HAL_OK)
  {
    Error_Handler();
  }

  /** Initializes the CPU, AHB and APB buses clocks
  */
  RCC_ClkInitStruct.ClockType = RCC_CLOCKTYPE_HCLK|RCC_CLOCKTYPE_SYSCLK
                              |RCC_CLOCKTYPE_PCLK1|RCC_CLOCKTYPE_PCLK2;
  RCC_ClkInitStruct.SYSCLKSource = RCC_SYSCLKSOURCE_PLLCLK;
  RCC_ClkInitStruct.AHBCLKDivider = RCC_SYSCLK_DIV1;
  RCC_ClkInitStruct.APB1CLKDivider = RCC_HCLK_DIV2;
  RCC_ClkInitStruct.APB2CLKDivider = RCC_HCLK_DIV1;

  if (HAL_RCC_ClockConfig(&RCC_ClkInitStruct, FLASH_LATENCY_2) != HAL_OK)
  {
    Error_Handler();
  }
  PeriphClkInit.PeriphClockSelection = RCC_PERIPHCLK_USB|RCC_PERIPHCLK_USART2
                              |RCC_PERIPHCLK_I2C1;
  PeriphClkInit.Usart2ClockSelection = RCC_USART2CLKSOURCE_PCLK1;
  PeriphClkInit.I2c1ClockSelection = RCC_I2C1CLKSOURCE_HSI;
  PeriphClkInit.USBClockSelection = RCC_USBCLKSOURCE_PLL_DIV1_5;
  if (HAL_RCCEx_PeriphCLKConfig(&PeriphClkInit) != HAL_OK)
  {
    Error_Handler();
  }
}

/**
  * @brief I2C1 Initialization Function
  * @param None
  * @retval None
  */
static void MX_I2C1_Init(void)
{

  /* USER CODE BEGIN I2C1_Init 0 */

  /* USER CODE END I2C1_Init 0 */

  /* USER CODE BEGIN I2C1_Init 1 */

  /* USER CODE END I2C1_Init 1 */
  hi2c1.Instance = I2C1;
  hi2c1.Init.Timing = 0x00201D2B;
  hi2c1.Init.OwnAddress1 = 0;
  hi2c1.Init.AddressingMode = I2C_ADDRESSINGMODE_7BIT;
  hi2c1.Init.DualAddressMode = I2C_DUALADDRESS_DISABLE;
  hi2c1.Init.OwnAddress2 = 0;
  hi2c1.Init.OwnAddress2Masks = I2C_OA2_NOMASK;
  hi2c1.Init.GeneralCallMode = I2C_GENERALCALL_DISABLE;
  hi2c1.Init.NoStretchMode = I2C_NOSTRETCH_DISABLE;
  if (HAL_I2C_Init(&hi2c1) != HAL_OK)
  {
    Error_Handler();
  }

  /** Configure Analogue filter
  */
  if (HAL_I2CEx_ConfigAnalogFilter(&hi2c1, I2C_ANALOGFILTER_ENABLE) != HAL_OK)
  {
    Error_Handler();
  }

  /** Configure Digital filter
  */
  if (HAL_I2CEx_ConfigDigitalFilter(&hi2c1, 0) != HAL_OK)
  {
    Error_Handler();
  }
  /* USER CODE BEGIN I2C1_Init 2 */

  /* USER CODE END I2C1_Init 2 */

}

/**
  * @brief SPI1 Initialization Function
  * @param None
  * @retval None
  */
static void MX_SPI1_Init(void)
{

  /* USER CODE BEGIN SPI1_Init 0 */

  /* USER CODE END SPI1_Init 0 */

  /* USER CODE BEGIN SPI1_Init 1 */

  /* USER CODE END SPI1_Init 1 */
  /* SPI1 parameter configuration*/
  hspi1.Instance = SPI1;
  hspi1.Init.Mode = SPI_MODE_MASTER;
  hspi1.Init.Direction = SPI_DIRECTION_2LINES;
  hspi1.Init.DataSize = SPI_DATASIZE_8BIT;
  hspi1.Init.CLKPolarity = SPI_POLARITY_HIGH;
  hspi1.Init.CLKPhase = SPI_PHASE_2EDGE;
  hspi1.Init.NSS = SPI_NSS_SOFT;
  hspi1.Init.BaudRatePrescaler = SPI_BAUDRATEPRESCALER_8;
  hspi1.Init.FirstBit = SPI_FIRSTBIT_MSB;
  hspi1.Init.TIMode = SPI_TIMODE_DISABLE;
  hspi1.Init.CRCCalculation = SPI_CRCCALCULATION_DISABLE;
  hspi1.Init.CRCPolynomial = 7;
  hspi1.Init.CRCLength = SPI_CRC_LENGTH_DATASIZE;
  hspi1.Init.NSSPMode = SPI_NSS_PULSE_DISABLE;
  if (HAL_SPI_Init(&hspi1) != HAL_OK)
  {
    Error_Handler();
  }
  /* USER CODE BEGIN SPI1_Init 2 */

  /* USER CODE END SPI1_Init 2 */

}

/**
  * @brief TIM2 Initialization Function
  * @param None
  * @retval None
  */
static void MX_TIM2_Init(void)
{

  /* USER CODE BEGIN TIM2_Init 0 */

  /* USER CODE END TIM2_Init 0 */

  TIM_ClockConfigTypeDef sClockSourceConfig = {0};
  TIM_MasterConfigTypeDef sMasterConfig = {0};

  /* USER CODE BEGIN TIM2_Init 1 */

  /* USER CODE END TIM2_Init 1 */
  htim2.Instance = TIM2;
  htim2.Init.Prescaler = 7199;
  htim2.Init.CounterMode = TIM_COUNTERMODE_UP;
  htim2.Init.Period = 4294967295;
  htim2.Init.ClockDivision = TIM_CLOCKDIVISION_DIV1;
  htim2.Init.AutoReloadPreload = TIM_AUTORELOAD_PRELOAD_DISABLE;
  if (HAL_TIM_Base_Init(&htim2) != HAL_OK)
  {
    Error_Handler();
  }
  sClockSourceConfig.ClockSource = TIM_CLOCKSOURCE_INTERNAL;
  if (HAL_TIM_ConfigClockSource(&htim2, &sClockSourceConfig) != HAL_OK)
  {
    Error_Handler();
  }
  sMasterConfig.MasterOutputTrigger = TIM_TRGO_RESET;
  sMasterConfig.MasterSlaveMode = TIM_MASTERSLAVEMODE_DISABLE;
  if (HAL_TIMEx_MasterConfigSynchronization(&htim2, &sMasterConfig) != HAL_OK)
  {
    Error_Handler();
  }
  /* USER CODE BEGIN TIM2_Init 2 */

  /* USER CODE END TIM2_Init 2 */

}

/**
  * @brief USART2 Initialization Function
  * @param None
  * @retval None
  */
static void MX_USART2_UART_Init(void)
{

  /* USER CODE BEGIN USART2_Init 0 */

  /* USER CODE END USART2_Init 0 */

  /* USER CODE BEGIN USART2_Init 1 */

  /* USER CODE END USART2_Init 1 */
  huart2.Instance = USART2;
  huart2.Init.BaudRate = 115200;
  huart2.Init.WordLength = UART_WORDLENGTH_8B;
  huart2.Init.StopBits = UART_STOPBITS_1;
  huart2.Init.Parity = UART_PARITY_NONE;
  huart2.Init.Mode = UART_MODE_TX_RX;
  huart2.Init.HwFlowCtl = UART_HWCONTROL_NONE;
  huart2.Init.OverSampling = UART_OVERSAMPLING_16;
  huart2.Init.OneBitSampling = UART_ONE_BIT_SAMPLE_DISABLE;
  huart2.AdvancedInit.AdvFeatureInit = UART_ADVFEATURE_NO_INIT;
  if (HAL_UART_Init(&huart2) != HAL_OK)
  {
    Error_Handler();
  }
  /* USER CODE BEGIN USART2_Init 2 */

  /* USER CODE END USART2_Init 2 */

}

/**
  * @brief GPIO Initialization Function
  * @param None
  * @retval None
  */
static void MX_GPIO_Init(void)
{
  GPIO_InitTypeDef GPIO_InitStruct = {0};
  /* USER CODE BEGIN MX_GPIO_Init_1 */

  /* USER CODE END MX_GPIO_Init_1 */

  /* GPIO Ports Clock Enable */
  __HAL_RCC_GPIOE_CLK_ENABLE();
  __HAL_RCC_GPIOC_CLK_ENABLE();
  __HAL_RCC_GPIOF_CLK_ENABLE();
  __HAL_RCC_GPIOA_CLK_ENABLE();
  __HAL_RCC_GPIOB_CLK_ENABLE();

  /*Configure GPIO pin Output Level */
  HAL_GPIO_WritePin(GPIOE, CS_I2C_SPI_Pin|LD4_Pin|LD3_Pin|LD5_Pin
                          |LD7_Pin|LD9_Pin|LD10_Pin|LD8_Pin
                          |LD6_Pin, GPIO_PIN_RESET);

  /*Configure GPIO pins : DRDY_Pin MEMS_INT3_Pin MEMS_INT4_Pin */
  GPIO_InitStruct.Pin = DRDY_Pin|MEMS_INT3_Pin|MEMS_INT4_Pin;
  GPIO_InitStruct.Mode = GPIO_MODE_EVT_RISING;
  GPIO_InitStruct.Pull = GPIO_NOPULL;
  HAL_GPIO_Init(GPIOE, &GPIO_InitStruct);

  /*Configure GPIO pin : CS_I2C_SPI_Pin */
  GPIO_InitStruct.Pin = CS_I2C_SPI_Pin;
  GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_PP;
  GPIO_InitStruct.Pull = GPIO_NOPULL;
  GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_HIGH;
  HAL_GPIO_Init(CS_I2C_SPI_GPIO_Port, &GPIO_InitStruct);

  /*Configure GPIO pin : B1_Pin */
  GPIO_InitStruct.Pin = B1_Pin;
  GPIO_InitStruct.Mode = GPIO_MODE_INPUT;
  GPIO_InitStruct.Pull = GPIO_NOPULL;
  HAL_GPIO_Init(B1_GPIO_Port, &GPIO_InitStruct);

  /*Configure GPIO pins : LD4_Pin LD3_Pin LD5_Pin LD7_Pin
                           LD9_Pin LD10_Pin LD8_Pin LD6_Pin */
  GPIO_InitStruct.Pin = LD4_Pin|LD3_Pin|LD5_Pin|LD7_Pin
                          |LD9_Pin|LD10_Pin|LD8_Pin|LD6_Pin;
  GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_PP;
  GPIO_InitStruct.Pull = GPIO_NOPULL;
  GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_LOW;
  HAL_GPIO_Init(GPIOE, &GPIO_InitStruct);

  /*Configure GPIO pin : PE1 */
  GPIO_InitStruct.Pin = GPIO_PIN_1;
  GPIO_InitStruct.Mode = GPIO_MODE_IT_RISING;
  GPIO_InitStruct.Pull = GPIO_NOPULL;
  HAL_GPIO_Init(GPIOE, &GPIO_InitStruct);

  /* EXTI interrupt init*/
  HAL_NVIC_SetPriority(EXTI1_IRQn, 0, 0);
  HAL_NVIC_EnableIRQ(EXTI1_IRQn);

  /* USER CODE BEGIN MX_GPIO_Init_2 */

  /* USER CODE END MX_GPIO_Init_2 */
}

/* USER CODE BEGIN 4 */

/* USER CODE END 4 */

/**
  * @brief  This function is executed in case of error occurrence.
  * @retval None
  */
void Error_Handler(void)
{
  /* USER CODE BEGIN Error_Handler_Debug */
  /* User can add his own implementation to report the HAL error return state */
  __disable_irq();
  while (1)
  {
  }
  /* USER CODE END Error_Handler_Debug */
}
#ifdef USE_FULL_ASSERT
/**
  * @brief  Reports the name of the source file and the source line number
  *         where the assert_param error has occurred.
  * @param  file: pointer to the source file name
  * @param  line: assert_param error line source number
  * @retval None
  */
void assert_failed(uint8_t *file, uint32_t line)
{
  /* USER CODE BEGIN 6 */
  /* User can add his own implementation to report the file name and line number,
     ex: printf("Wrong parameters value: file %s on line %d\r\n", file, line) */
  /* USER CODE END 6 */
}
#endif /* USE_FULL_ASSERT */
