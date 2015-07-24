// Wersja testowa bazuje na strumieniu z pliku

"use strict";
var express = require('express')
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var i;

// konfiguracja serwera http + route do index.html
app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
}); 

//serwowanie plików statycznych
app.use('/static', express.static('static')); 

// start serwera
http.listen(3001, function(){
  console.log('> status : nasłuchuje na porcie *:3001');
}); 

// komunikaty z socketów o połączeniu/rozłączeniu użytkownika
connectionStatusMessages();

// funkcja, która wyzwala startStream po otrzymaniu słów kluczowych
listenForStartEvent();

// funkcja obsługująca komunikacje z twitterem
function startStream(keywords) {
  var TwitterStreamChannels = require('twitter-stream-channels').getMockedClass();
  var credentials = require('./my.twitter.credentials.json');
  var tweetsMock = require('./node_modules/twitter-stream-channels/mocks/data/tweets.json');

  var timeout = 12000; // po tym czasie przerywamy streamowanie
  var connectInterval = 10000; // czas do odczekania do ponownej próby połączenia

  var client = new TwitterStreamChannels(credentials); // potrzebne później przy łączeniu do twitter stream api

  var channels = {}
  var keyCount = keywords.length;
  for (i=0; i < keyCount; i++) {
    channels[i] = keywords[i];
  }

  var stream = client.streamChannels({track:channels}); // inicjalizacja strumienia

// komunikacja związana z połączeniem:
  handleTwitterConnectionStatus(stream, keywords);

// obsługa trafionych wyrazów
  handleHits(stream);

// po określonym czasie zamykamy stream - absolutne maximum to 15m, ale na potrzeby gry to max 1 minuta
  setTimeout(function () {
      onTimeout(stream, keywords)}, 
    timeout);
};

function connectionStatusMessages() {
  io.on('connection', function(socket){
    console.log('> status : użytkownik połączony');
    socket.on('disconnect', function(){
      console.log('> status : użytkownik rozłączony');
    });
  });
};

function listenForStartEvent() {
  io.on('connection', function(socket){
    socket.on('start stream', function(keywords){
      console.log('> status : wyszukuje słów kluczowych: ' + keywords);
      startStream(keywords);
    });
  });
};

function handleTwitterConnectionStatus(stream, keywords)
{
    var connected = false;

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
};

  function handleHits(stream) {
    stream.on('channels',function(tweet){
      if (Object.keys(tweet.$channels).length > 0) { // sprawdzam, czy tweet pasuje do ktoregos z kanalow
        var scorersArray = Object.keys(tweet.$channels); // liczba graczy, ktorzy uzyskali punkt za danego tweeta
        console.log(tweet.text);
        io.emit('scorers', scorersArray);
      };
    });
  };

  function onTimeout(stream, keywords) {
    stream.stop();
    console.log('> twitter : strumień zatrzymany');
    io.emit('twit message', 'Przestałem nasłuchiwać dla słów: ' + keywords);
  }