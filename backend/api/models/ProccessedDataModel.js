var mongoose = require('mongoose');
var Schema   = mongoose.Schema;

var ProccessedDataSchema = new Schema({
	'user' : {
	 	type: Schema.Types.ObjectId,
	 	ref: 'User'
	},
	'date' : Date,
	'totalSteps' : Number,
	'avgTemperature' : Number,
	'summary' : String
});

module.exports = mongoose.model('ProccessedData', ProccessedDataSchema);
