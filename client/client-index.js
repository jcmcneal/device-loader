// Require
var io = require('socket.io-client');
var exec = require('child_process').exec;
var machine = require('os');
var ss = require('socket.io-stream');
var md5File = require('md5-file');
var fs = require('fs');

var interfaces = machine.networkInterfaces();
var mac;
var ip;
if('eth0' in interfaces){
    ip = interfaces.eth0[0].address,
    mac = interfaces.eth0[0].mac
}else{
    ip = interfaces.en0[1].address,
    mac = interfaces.en0[1].mac
}
var settings = {
    ip: ip,
    mac: mac,
    setupHash: '',
    sameHash: 0
};

var path = __dirname+'/';
var setupFile = 'setup-internal.gz';
if (fs.existsSync(path+setupFile)) {
    settings.setupHash = md5File(path+setupFile);
}

var hostServer = 'http://192.168.1.16:4000';
// var hostServer = 'http://localhost:4000';
var namespace = '/devices';
// Client
var socket = io(hostServer+namespace, {
    'multiplex': false,
    'forceNew': true,
    'reconnection': true,
    'reconnectionDelay': 5000,
    'reconnectionDelayMax' : 5000,
    'reconnectionAttempts': 3
});

var beginLoad = false;
socket.on('connect', function(){
    socket.on('welcome',function(data){
        console.log("Server: "+data.message);
        socket.emit('settings', settings);
        if(data.setupHash == settings.setupHash){
            setStatus('Setup file up to date!');
            settings.sameHash = 1;
        }
    });
    socket.on('datetime', function(date){
        exec('date -s "'+date+'" &&  hwclock --systohc --utc', function(error, stdout, stderr){
            console.log(stdout);
        });
    });
    socket.on('beginLoad', function(stats){
        beginLoad = true;
        setStatus('Starting Load...');
        receiveSetup(stats);
    });
    socket.on('runSetup',function(){
        runSetup();
    });
    socket.on('shutdown',function(){
        exec('sudo shutdown now',function(error,stdout,stderr){
            setStatus('Shutting Down...');
            socket.emit('buffer', stdout); 
        });
    });
    // Receive File
    var stream = ss.createStream();
    var receiveSetup = function(file){
        setStatus('Asking for setup...');
        ss(socket).emit('getSetup', stream);
        stream.pipe(fs.createWriteStream(file.filename));
        var size = 0;
        stream.on('data', function(chunk) {
          size += chunk.length;
          setStatus(Math.floor(size / file.size * 100) + '%' + ' downloaded...');
        });
        stream.on('end', function() {
          setStatus('File received: '+file.filename);
          runSetup(file);
        });
    };
    // Run Setup
    var runSetup = function(file){
        setStatus('Running Setup Script');
        var runScript = exec('sh setup-internal '+settings.sameHash);
        runScript.stdout.on('data', function(data) {
            socket.emit('buffer', data); 
        });
        runScript.stdout.on('end', function(data) {
            socket.emit('Finished', data); 
        });
    }

    var setStatus = function(status){
        console.log(status);
        socket.emit('status', status);
    };
});

socket.on('connect_error', function(){
    console.log('Failed to connect to host.');
});
socket.on('reconnect_attempt', function(){
    console.log('Attempting to reconnect...');
});
socket.on('reconnect_failed', function(){
    console.log('Maxed out reconnect attempts. Exiting.');
});