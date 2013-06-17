
var port = 8603;
var io = require('socket.io').listen(port),
    dirty = require('dirty'),
    db = dirty('rsvps.db');

io.set( 'origins', '*devint.adg.local*:*' );

db.on('load', main);

function main(){

    var changeState = function (_data) {
        var member = parseInt(_data.member);
        var state = parseInt(_data.state);
        db.set(member, state, function() {
          console.log('User ' + member + ' is now saved as ' + state + ' on disk.');
        });

    };


    io.sockets.on('connection', function (socket) {

        var members = [];

        db.forEach(function(key, val) {
              members.push({member:key, state:val});
        });

        socket.emit('loadData', members);
  

        socket.on('changeState', function (data) {
            socket.broadcast.emit('changeState', data);
            console.log(data);
            changeState(data);
        });


    });
}
