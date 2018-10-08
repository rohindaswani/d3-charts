// source: https://github.com/xoor-io/d3-canvas-example

var dataExample = [];

for (var i=0; i < 10000; i++) {
  var _x = Math.floor(Math.random() * 999999) + 1;
  var _y = Math.floor(Math.random() * 999999) + 1;

  dataExample.push([_x,_y]);
}

const pointColor = "#3585ff";
const margin = { top:20, right: 15, bottom: 60, left: 70};
const outerWidth = 800;
const outerHeight = 600;
const width = outerWidth - margin.left - margin.right;
const height = outerHeight - margin.top - margin.bottom;

const container = d3.select('.scatter-container');

const svgChart = container.append("svg:svg")
  .attr('width', outerWidth)
  .attr('height', outerHeight)
  .attr('class', 'svg-plot')
  .append('g')
  .attr('transform', `translate(${margin.left}, ${margin.top})`);

const canvasChart = container.append('canvas')
  .attr('width', width)
  .attr('height', height)
  .style('margin-left', margin.left + 'px')
  .style('margin-top', margin.top + 'px')
  .attr('class', 'canvas-plot');

const context = canvasChart.node().getContext('2d');

const x = d3.scaleLinear()
  .domain([0, d3.max(dataExample, function (d) { return d[0]})])
  .range([0, width])
  .nice();
const y = d3.scaleLinear()
  .domain([0, d3.max(dataExample, function (d) { return d[1]})])
  .range([height, 0])
  .nice();

const xAxis = d3.axisBottom(x);
const yAxis = d3.axisLeft(y);

const gxAxis = svgChart.append('g')
  .attr("transform", `translate(0,${height})`)
  .call(xAxis);

const gyAxis = svgChart.append('g')
  .call(yAxis);

svgChart.append('text')
  .attr('x', `-${height/2}`)
  .attr('dy', '-3.5em')
  .attr('transform', 'rotate(-90)')
  .text('Axis Y');

svgChart.append('text')
  .attr('x', `${width/2}`)
  .attr('y', '560')
  .text('Axis X');

function _drawPoint(point) {
  context.beginPath();
  context.fillStyle = pointColor;
  const px = x(point[0]);
  const py = y(point[1]);

  context.arc(px, py, 1.2, 0, 2 *Math.PI, true);
  context.fill();
}

function drawPoint(scaleX, scaleY, point, k) {
  context.beginPath();
  context.fillStyle = pointColor;
  const px = scaleX(point[0]);
  const py = scaleY(point[1]);

  context.arc(px, py, 1.2 * k, 0, 2 * Math.PI, true);
  context.fill();
}

var lastTransform = null;

function draw(transform) {
  console.log('transform', transform);
  lastTransform = transform;

  const scaleX = transform.rescaleX(x);
  const scaleY = transform.rescaleY(y);

  gxAxis.call(xAxis.scale(scaleX));
  gyAxis.call(yAxis.scale(scaleY));

  context.clearRect(0, 0, width, height);

  dataExample.forEach(point => {
    drawPoint(scaleX, scaleY, point, transform.k);
  });
}

draw(d3.zoomIdentity);

const zoom_function = d3.zoom().scaleExtent([1, 1000])
  .on('zoom', function() {
    const transform = d3.event.transform;
    context.save();
    draw(transform);
    context.restore();
});

canvasChart.call(zoom_function);

const toolList = container.select('.tools')
  .style('margin-top', margin.top + 'px')
  .style('visibility', 'visible');

toolList.select('#reset').on('click', function() {
  const t= d3.zoomIdentity.translate(0, 0).scale(1);
  canvasChart.transition()
    .duration(200)
    .ease(d3.easeLinear)
    .call(zoom_function.transform, t)
});

const svgChartParent = d3.select('svg');
const zoomButton = toolList.select('#zoom').on('click', function() {
  toolList.selectAll('.active').classed('active', false);
  zoomButton.classed('active', true);
  canvasChart.style('z-index', 1);
  svgChartParent.style('z-index', 0);
});

const brushButton = toolList.select('#brush').on('click', function() {
  toolList.selectAll('.active').classed('active', false);
  brushButton.classed('active', false);
  canvasChart.style('z-index',0);
  svgChartParent.style('z-index', 1);
});

const brush = d3.brush().extent([0,0], [width, height])
  .on('start', function() { brush_startEvent(); })
  .on('brush', function() { brush_brushEvent(); })
  .on('end', function() { brush_endEvent(); })
  .on('start.nokey', function() {
    d3.select(window).on('keydown.brush keyup.brush', null);
  });

const brushSvg = svgChart
  .append('g')
  .attr('class', 'brush')
  .call(brush);

var brushStartPoint = null;

function brush_startevent() {
  const sourceEvent = d3.event.sourceEvent;
  const selection = d3.event.selection;
  if (sourceEvent.type === 'mousedown') {
    brushStartPoint = {
      mouse: {
        x: sourceEvent.screenX,
        y: sourceEvent.screenY
      },
      x: selection[0][0],
      y: selection[0][1]
    }
  } else {
    brushStartPoint = null;
  }
}

function brush_brushEvent() {
  if (brushStartPoint !== null) {
    const scale = width/height;
    const sourceEvent = d3.event.sourceEvent;
    const mouse = {
      x: sourceEvent.screenX,
      y: sourceEvent.screenY
    }
    if (mouse.x < 0) { mouse.x = 0;}
    if (mouse.y < 0) { mouse.y = 0;}
    var distance = mouse.y - brushStartPoint.mouse.y;
    var yPosition = brushStartPoint.y + distance;
    var xCorMulti = 1;

    if ((distance < 0 && mouse.x > brushStartPoint.mouse.x) || (distance > 0 && mouse.x < brushStartPoint.mouse.x)) {
      xCorMulti = -1;
    }

    if (yPosition > height) {
      distance = height - brushStartPoint.y;
      yPosition = height;
    } else if (yPosition < 0) {
      distance = -brushStartPoint.y;
      yPosition = 0;
    }

    var xPosition = brushStartPoint.x + distance * scale * xCorMulti;
    const oldDistance = distance;

    if (xPosition > width) {
      distance = (width - brushStartPoint.x) /scale;
      xPosition = width;
    } else if (xPosition < 0) {
      distance = brushStartPoint.x /scale;
      xPosition = 0;
    }

    if (oldDistance !== distance) {
      distance *= (oldDistance < 0) ? -1 : 1;
      yPosition = brushStartPoint.y + distance;
    }

    const selection = svgChart.select(".selection");

    const posValue = Math.abs(distance);
    selection.attr('width', posValue * scale).attr('height', posValue);

    if (xPosition < brushStartPoint.x) {
      selection.attr('x', xPosition);
    }
    if (yPosition < brushStartPoint.y) {
      selection.attr('y', yPosition);
    }
    const minX = Math.min(brushStartPoint.x, xPosition);
    const maxX = Math.max(brushStartPoint.x, xPosition);
    const minY = Math.min(brushStartPoint.y, yPosition);
    const maxY = Math.max(brushStartPoint.y, yPosition);

    lastSelection = {x1: minX, x2: maxX, y1: minY, y2: maxY};
  }
}

function brush_endEvent() {
  const s = d3.event.selection;
  if (!s && lastSelection !== null) {
    //Re-scale axis for the last transformation
    var zx = lastTransform.rescaleX(x);
    var zy = lastTransform.rescaleY(y);

    // Calc distance on Axis-X to use in scale
    var totalX = Math.abs(lastSelection.x2 - lastSelection.x1);

    // get current point [x,y] on canvas
    const originalPoint = [zx.invert(lastSelection.x1), zy.invert(lastSelection.y1)]

    //calc scale mapping distance AxisX in width * k
    // example: scale 1, width 830, totalX 415
    // result in zoom of 2
    const t = d3.zoomIdentity.scale(((width * lastTransform.k) / totalX));

    // re-scale axis for the new transformation

    zx = t.rescaleX(x);
    zy = t.rescaleY(y);

    // call zoom function with a new transformation from the new scale and brush position
    // to calculate the brush position we use the originalPoint in the new Axis scale
    // originalPoint it's always positive (because we are sure it's within the canvas)
    // we need to translate this original plot to [0, 0] so we do (0 - position) or (position * -1)

    cavasChart
      .transition()
      .duration(200)
      .ease(d3.easeLinear)
      .call(zoom_function.transform,
        d3.zoomIdentity
          .translate(zx(originalPoint[0]) * -1, zy(originalPoint[1]) * -1)
          .scale(t.k));
    lastSelection = null;
  } else {
    brushSvg.call(brush.move, null);
  }
};