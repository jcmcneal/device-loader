var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var fs = require('fs');
var ss = require('socket.io-stream');
var md5File = require('md5-file');

var dio = io.of('/devices');
var uio = io.of('/users');

var devices = {};
var path = __dirname+'/';
var setupFile = 'setup-internal.gz';
var setupHash = '';

dio.on('connection', function(socket){
	// From Devices
	console.log('Device connected');
	// Check for updated setup file
	setupHash = md5File(path+setupFile);
	
	socket.emit('welcome', { 
		message: 'Welcome device to Remote Loader!',
		setupHash: setupHash
	});
	socket.on('settings', function(data){
		devices[socket.id] = { 
			id: socket.id,
			ip: data.ip,
			mac: data.mac,
			status: 'Ready',
			buffer: '',
			needsSetupFile: ((data.setupHash == setupHash) ? 0 : 1)
		};
		sendDevicesToUsers();
		// Send accurate date and time
		var datetime = new Date().toISOString()
			.replace(/T/, ' ').replace(/\..+/, '');
		console.log(datetime);
		socket.emit('datetime',datetime);
	});

	var sendDevicesToUsers = function(){
		uio.emit('devices', devices);
	};

	socket.on('buffer', function(data){
		devices[socket.id].buffer += data;
		uio.emit('buffer',{id:socket.id, buffer:data});
	});

	socket.on('status', function(data){
		devices[socket.id].status = data;
		uio.emit('status',{id:socket.id, status:data});
	});

	// Send Setup
	ss(socket).on('getSetup', function(stream) {
		console.log('Sending Setup File...');
		fs.createReadStream(path+setupFile).pipe(stream);
	});
	
	// On Device Disconnect
	socket.on('disconnect', function(){
		console.log('Device Disconnected');
		delete devices[socket.id];
		sendDevicesToUsers();
	});
});

uio.on('connection', function(socket){
	console.log('User connected');
	socket.emit('message', { message: 'Welcome user to Remote Loader!' });

	socket.on('getDevices', function(){
		socket.emit('devices', devices);
	});

	// Begin Load
	socket.on('beginLoad', function(data){
		if(devices[data.id].needsSetupFile == 0){
			dio.to(data.id).emit('runSetup');
			return;
		}
		fs.stat(path+setupFile, function(err, stats) {
			if(err){
				console.log('Problem with file: '+err);
				return;
			}
			console.log('Sending command to begin load on device');
			stats.filename = setupFile;
			dio.to(data.id).emit('beginLoad', stats);
		});
	});
	// Shutdown device
	socket.on('shutdown',function(data){
		console.log('Telling device to shutdown');
		dio.to(data.id).emit('shutdown');
	});

	// User disconnected
	socket.on('disconnect', function(){
		console.log('User Disconnected');
	});
});

server.listen(4000, function(){
	console.log('Listening on :4000');
});