
$(document).ready(function() {
  // game setup:
  var max_players     = 6; // max no of players
  var wrapper         = $(".input_fields_wrap"); //Fields wrapper
  var add_button      = $(".add_field_button"); //Add button ID
  
  var x = 1; //initlal player count
  $(add_button).click(function(e){ //on add input button click
      e.preventDefault();
      if(x < max_players){ 
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

  $('#playerSetup').modal({  backdrop: 'static', keyboard: false});
  $('#chart').hide();

  $('#setupGame').click(function(e) {
    e.preventDefault();
    var isReady = true; // if all the fields went through validation
    var playerKeys = []; // array for players

    $( ".form-group" ).removeClass( "has-success has-error") // validator display reset

    $('.form-control').each(function (i) {
      key = $(this).val();

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
      playersCount = playerKeys.length;
      canvas = draw(svg, playersCount);
      socket.emit('twit message', playerKeys);
    };
  });

});

var w = 800,
    h = 600,
    color = d3.scale.category10();

var svg = d3.select("#chart").append("svg:svg")
    .attr("width", w)
    .attr("height", h);

svg.append("svg:rect")
    .attr("width", w)
    .attr("height", h);

var canvas;
var socket = io();

// sluchamy kanalu scorers i dodajemy punkty graczom
socket.on('scorers', function(msg){
  Array.prototype.forEach.call(msg, function(player)
    {
      appendNode(svg, canvas['nodes'], canvas['force'], player);
    });
  });

function draw(svg, playersCount) {
  var force = d3.layout.force()
      .gravity(0)
      .charge(-3)
      .size([w, h]);

  var nodes = force.nodes();
  var playerBases = [];

  for (var i = 0; i < playersCount; i++)
  {
    newBase = {type: i, x: 3 * w / 6 + i*70, y: 2 * h / 6 + i*70, fixed: true}
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