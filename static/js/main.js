"use strict";
$.tweetGame = { 
    color: d3.scale.category10(),
    scores : [] 
}; //docelowo lepiej liczyc to po stronie serwera, ale ma to sens dopiero po zaimplementowaniu identyfikacji klienta 

$(document).ready(function() {
  // game setup:
  var w = $( window ).width(),
      h = $( window ).height(),
      socket = io(),
      canvas = {},
      svg = {};

  handleNewPlayerButtons();
  svg = appendSvg(w, h);

  $('#playerSetup').modal({ backdrop: 'static', keyboard: false});
  $('#chart').hide();

  $('#startGame').click(function(e) {
    e.preventDefault();
    var playerKeys = []; // array graczy
    var playersCount = 0;

    if (validateFields(playerKeys)) {
      playersCount = playerKeys.length;
      $('#playerSetup').modal('hide');
      $('#chart').show();

      canvas = draw(svg, playersCount, w, h);
      addCounters(svg, playerKeys, w, h); // dodajemy liczniki
      $.tweetGame.scores = buildscoresArray(playersCount);
      handleIncStream(socket, svg, canvas, w, h, playerKeys); // sluchamy kanalu scorers i dodajemy punkty graczom
    };
  });
});

function buildscoresArray(playersCount) {
  var i = 0;
  var scoresArray = [];
  for (i = 0; i < playersCount; i++) {
    scoresArray.push(0);
  };
  return scoresArray;
}

function getX(degrees, r, x) {
  return x + r  * Math.cos(getRad(degrees));
    }

function getY(degrees, r, y) {
  return y + r * Math.sin(getRad(degrees));
  }

function getRad(degrees) {
  var adjust = Math.PI / 2;
  return (degrees * Math.PI / 180) - adjust;
  }

function draw(svg, playersCount, w, h) {
  var force = d3.layout.force()
        .gravity(.01)
        .charge(-5)
        .size([w, h]),
      nodes = force.nodes(),
      i = 0,
      newPlayerBase = {},
      degrees = 360 / playersCount || 0,
      r = 300;

  for (i = 0; i < playersCount; i++)
  {
    newPlayerBase = {type: i, x: getX(degrees * i, r, w/2), y: getY(degrees * i, r, h/2), fixed: true};
    nodes.push(newPlayerBase);
  }

  svg.selectAll("circle")
      .data(nodes)
      .enter()
      .append("svg:circle")
      .attr("r", 10)
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; })
      .style("fill", fill)
      .call(force.drag);

  force.on("tick", function(e) {
    var k = e.alpha * .1;
    nodes.forEach(function(node) {
      var center = nodes[node.type];
      node.x += (center.x - node.x) * k;
      node.y += (center.y - node.y) * k;
      node.r = node.r * .1 * k;
    });

    svg.selectAll("circle")
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });
  });

  return {'nodes': nodes, 'force' : force};
}

function appendNode(svg, nodes, force, playerIdx, w, h) {
  var p0;
  var p1 = [w/2, h/2],
      node = {type: playerIdx, x: p1[0], y: p1[1], px: (p0 || (p0 = p1))[0], py: p0[1]};
  p0 = p1;

  svg.append("svg:circle")
      .data([node])
      .attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; })
      .attr("r", Math.random() * 16 + 4)
      .style("fill", fill)
    .transition()
      .delay(200)
      .attr("r", 4.5)

  nodes.push(node);
  force.start();
};

function fill(d) {
  return $.tweetGame.color(d.type);
}

function addCounters(svg, playerKeys, w, h) {
  // Dodajemy text do svg
  var counters = svg.selectAll("text")
                        .data(playerKeys)
                        .enter()
                        .append("text")
                        .attr("x", w - 300)
                        .attr("y", function (d) { return 100 + playerKeys.indexOf(d) * 30 } )
                        .text( 0 )
                        .attr("font-size", "24px")
                        .attr("fill", function (d) {return $.tweetGame.color(playerKeys.indexOf(d))})
                        .attr("id", function (d) { return 'playerCounter' + playerKeys.indexOf(d) });

  var labels = svg.selectAll("textLabels")
                        .data(playerKeys)
                        .enter()
                        .append("text")
                        .attr("x", w - 240)
                        .attr("y", function (d) { return 100 + playerKeys.indexOf(d) * 30 } )
                        .text( function (d) { return d } )
                        .attr("font-size", "24px")
                        .attr("fill", function (d) {return $.tweetGame.color(playerKeys.indexOf(d))});
}

function handleIncStream(socket, svg, canvas, w, h, playerKeys) {
  socket.emit('start stream', playerKeys); // wysylamy klucze do backendu
  socket.on('scorers', function(msg){
    Array.prototype.forEach.call(msg, function(player)
      {
        var counter = {},
            counterVal = 0;
        appendNode(svg, canvas['nodes'], canvas['force'], player, w, h);
        counter = d3.select('#playerCounter' + player);
        counterVal = parseInt(counter.text()) + 1;
        counter.text(counterVal);
        $.tweetGame.scores[player]++;
      });
    });
  socket.on('timeUp', function () {
    handleWinners(svg, w, h);
  });
  };

function handleWinners(svg, w, h) {
  var winners = determineWinners(),
      i = 0,
      winnerString = 'Player' + winners[0] + ' is the Winner! Congratulations.',
      winnersCount = winners.length;

  if (winnersCount > 1 ) {
    winnerString = 'Player' + winners.join(', Player') + ' are the Winners! Congratulations.'
  };

  svg.append("text")
                .attr("x", w/2)
                .attr("y", h/2)
                .attr("text-anchor", "middle")
                .text(winnerString)
                .attr("font-size", "36px")
                .attr("fill", "#FFF")
                .transition()
                  .delay(1000)
                  .attr("fill", "#000");

  var circles = d3.selectAll('circle').filter(function (d) { return d.type != winners[0]-1 && d.type != winners[1]-1 && d.type != winners[2]-1 && d.type != winners[3]-1 && d.type != winners[4]-1 && d.type != winners[5]-1});
  circles.transition().delay(3000).style('fill', '#AAA');
}

function determineWinners() {
  var winners = [],
      max = 0,
      i = 0,
      playerCount = $.tweetGame.scores.length;

  max = Math.max.apply(null, $.tweetGame.scores); // maxymalna wartosc z tablicy

  for (i = 0; i < playerCount; i++) {
    if ($.tweetGame.scores[i] === max) {
      winners.push(i+1);
    }; // na wypadek, gdyby bylo wiecej zwyciezcow
  };
  return winners;
}

function appendSvg(w, h) {
  var svg = d3.select("#chart").append("svg:svg")
      .attr("width", w)
      .attr("height", h);

  // svg.append("svg:ellipse")
  //   .attr('rx', 350)
  //   .attr('ry', 350)
  //   .attr('cx', w/2)
  //   .attr('cy', h/2)
  //   .style('fill', 'black')

  // svg.append("svg:rect")
  //     .attr("width", w)
  //     .attr("height", h);

  return svg;
}

function validateFields(playerKeys) {
  var isReady = true;
  $('.form-group').removeClass( "has-success has-error") // resetuje nadane przez walidator klasy css

  $('.form-control').each(function (i) {
    var key = $(this).val();

    if (key === "") {
      isReady = false;
      $(this).attr('placeholder', 'Please fill this field'); 
      $(this).parent().addClass('has-error');
    }
    else {
      playerKeys.push(key);
      $(this).parent().addClass('has-success');
      }
  });
  return isReady;
}

function handleNewPlayerButtons() {
  var maxPlayers     = 6; // maksymalna liczba graczy
  var wrapper        = $(".input_fields_wrap"); // opakowanie pol z inputem (ulatwia pozniejsze usuwanie)
  var addButton      = $("#add_player_button"); // uchwyt do przycisku dodawania nowych graczy
  
  var x = 1; //początkowa liczba graczy

  $(addButton).click(function(e){ //obsluga guzika dodaj graczy
      e.preventDefault();
      if(x < maxPlayers){ 
          x++; // pilnuje liczby zeby nie przekroczyc maksymalnej liczby graczy
          $(wrapper).append('<div class="form-group">' + 
            '<input type="text" class="form-control" ' + 
            'placeholder="player' + x +
            '"/><a href="#"' + 
            'class="remove_field">Remove</a></div>'); // dodaje diva z inputem na klucze
      }
  });
  
  $(wrapper).on("click",".remove_field", function(e){ // usuwanie divow z inputem
      e.preventDefault(); $(this).parent('div').remove(); x--;
  })
};