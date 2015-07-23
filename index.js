// Wstępna wersja bazująca na stream.io chacie i przykładach z twitter-stream-channels
// wersje testowe bazuja na strumieniu z pliku

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// funkcja obsługująca komunikacje z twitterem
function startStream(keyword) {
  var TwitterStreamChannels = require('twitter-stream-channels').getMockedClass();
  var credentials = require('./my.twitter.credentials.json');
  var tweetsMock = require('./node_modules/twitter-stream-channels/mocks/data/tweets.json');

  var timeout = 6000; // po tym czasie przerywamy streamowanie
  var connectInterval = 10000; // czas do odczekania do ponownej próby połączenia

  var client = new TwitterStreamChannels(credentials); // potrzebne później przy łączeniu do twitter stream api
  var connected = false;

  var channels = {
      "gracz1" : [keyword]}; // docelowo budowana w zależności od liczby graczy

  var stream = client.streamChannels({track:channels}); // inicjalizacja strumienia

// komunikacja związana z połączeniem:
  io.emit('twit message', 'Zaczynam nasłuchiwać dla słowa: ' + keyword); 

  stream.on('connect', function() {
    console.log('> twitter : próbuje połączyć z twitterem');
  });

  stream.on('connected', function() {
    if(connected === false){
      console.log('> twitter : połączono');
      connected = true;
    }
  });

  stream.on('disconnect', function() {
    console.log('> twitter : rozłączono');
    connected = false;
  });

  stream.on('reconnect', function (request, response, connectInterval) {
    console.log('> twitter : czekam na ponowne połączenie '+connectInterval+'ms');
  });


// obsługa trafionych wyrazów
  stream.on('channels/gracz1',function(tweet){
      console.log('>gracz',tweet.text);
      io.emit('twit message', '>gracz1: ' + tweet.text);
  });


// po określonym czasie zamykamy stream - absolutne maximum to 15m, ale na potrzeby gry to max 1 minuta
  setTimeout(function() {
    stream.stop();
    console.log('> twitter : strumień zatrzymany');
    io.emit('twit message', 'Przestałem nasłuchiwać dla słowa: ' + keyword);
  }, timeout);
};


// konfiguracja serwera http
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

http.listen(3001, function(){
  console.log('nasłuchuje na porcie *:3001');
});


// komunikaty z socketów o połączeniu/rozłączeniu użytkownika
io.on('connection', function(socket){
  console.log('użytkownik połączony');
  socket.on('disconnect', function(){
    console.log('użytkownik rozłączony');
  });
});

// funkcja, która wyzwala startStream po otrzymaniu słów kluczowych
io.on('connection', function(socket){
  socket.on('twit message', function(keyword){
    console.log('słowa kluczowe: ' + keyword);
    startStream(keyword);
  });
});