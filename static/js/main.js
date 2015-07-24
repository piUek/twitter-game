"use strict";
  var w = $( window ).width(),
      h = $( window ).height(),
      color = d3.scale.category10(),
      socket = io();

$(document).ready(function() {
  // game setup:
  var canvas = {};
  handleNewPlayerButtons();

  var svg = appendSvg();

  // sluchamy kanalu scorers i dodajemy punkty graczom
  socket.on('scorers', function(msg){
    Array.prototype.forEach.call(msg, function(player)
      {
        appendNode(svg, canvas['nodes'], canvas['force'], player);
        var counter = d3.select('#playerCounter' + player);
        var counterVal = parseInt(counter.html()) + 1;
        counter.html(counterVal);
      });
    });

  $('#playerSetup').modal({ backdrop: 'static', keyboard: false});
  $('#chart').hide();

  $('#startGame').click(function(e) {
    e.preventDefault();
    var isReady = true; // flaga walidacji
    var playerKeys = []; // array graczy

    $( ".form-group" ).removeClass( "has-success has-error") // resetuje nadane css klasy przez walidator

    $('.form-control').each(function (i) {
      var key = $(this).val();

      if (key == "") {
        isReady = false;
        $(this).attr('placeholder', 'Please fill this field'); 
        $(this).parent().addClass('has-error');
      }
      else {
        playerKeys.push(key);
        $(this).parent().addClass('has-success');
        }
    });

    if (isReady) {
      $('#playerSetup').modal('hide');
      $('#chart').show();
      var playersCount = playerKeys.length;
      canvas = draw(svg, playersCount, w, h);
      socket.emit('start stream', playerKeys);

      addCounters(svg, playerKeys);
    };
  });

});


function draw(svg, playersCount, w, h) {
  var force = d3.layout.force()
      .gravity(0)
      .charge(-3)
      .size([w, h]);

  var nodes = force.nodes();
  var playerBases = [];

  for (var i = 0; i < playersCount; i++)
  {
    var newBase = {type: i, x: 3 * w / 6 + i*70, y: 2 * h / 6 + i*150, fixed: true}
    nodes.push(newBase);
  }

  svg.selectAll("circle")
      .data(nodes)
      .enter().append("svg:circle")
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

function appendNode(svg, nodes, force, playerIdx) {
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
      // .each("end", function() { nodes.splice(3, 1); })
      // .remove();

  nodes.push(node);
  force.start();
};

function fill(d) {
  return color(d.type);
}

function addCounters(svg, playerKeys) {
  // Dodajemy text do svg
  var text = svg.selectAll("text")
                        .data(playerKeys)
                        .enter()
                        .append("text");

  // Wypełniamy trescia
  var textLabels = text
                 .attr("x", w - 200)
                 .attr("y", function (d) { return 100 + playerKeys.indexOf(d) * 30 } )
                 // .text( function (d) {return 'Player' + (playerKeys.indexOf(d) + 1 + ' ' + d + ': ')} )
                 // .text( function (d) { return d + ': 0'} )
                 .text( function (d) {return '0'} )
                 .attr("font-family", "sans-serif")
                 .attr("font-size", "20px")
                 .attr("fill", function (d) {return color(playerKeys.indexOf(d))})
                 .attr("id", function (d) { return 'playerCounter' + playerKeys.indexOf(d) });;
}

function appendSvg() {
  var svg = d3.select("#chart").append("svg:svg")
      .attr("width", w)
      .attr("height", h);

  svg.append("svg:rect")
      .attr("width", w)
      .attr("height", h);
  return svg;
}

function handleNewPlayerButtons() {
  var maxPlayers     = 6; // max no of players
  var wrapper         = $(".input_fields_wrap"); //Fields wrapper
  var addButton      = $(".add_player_button"); //Add button ID
  
  var x = 1; //initial player count

  $(addButton).click(function(e){ //on add input button click
      e.preventDefault();
      if(x < maxPlayers){ 
          x++; //text box increment
          $(wrapper).append('<div class="form-group">' + 
            '<input type="text" class="form-control" ' + 
            'placeholder="player' + x +
            '"/><a href="#"' + 
            'class="remove_field">Remove</a></div>'); //add input box
      }
  });
  
  $(wrapper).on("click",".remove_field", function(e){ //user click on remove text
      e.preventDefault(); $(this).parent('div').remove(); x--;
  })
};