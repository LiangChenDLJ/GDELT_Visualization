// reference:
// https://bl.ocks.org/HarryStevens/raw/c893c7b441298b36f4568bc09df71a1e/


function parseStreamData(countryPair) {
    let output = [];
    if ( !(countryPair in streamGraphData))
        return output;
    let data = streamGraphData[countryPair];
    for (let ind in data) {
        let record = data[ind];
        let date = record[0];
        let counts = record.slice(3, 23);
        for (let cind in counts) {
            output.push({
                key: eventL1CodeNames[cind],
                value: parseInt(counts[cind]),
                // check if moment works well for month / date
                date: moment(date, 'YYYY')._d
            })
        }
    }
    return output;
}

var chartInd = '.stream.chart';
var yearInterval = 1;

function breakCalc(x){
    x <= 480 ? y = 'xs' : y = 'md';
    return y;
}

var breakpoint = breakCalc($(window).width());

$(window).resize(function(){
    var breakpoint = breakCalc($(window).width());
})

// change the height of the chart depending on the breakpoint
function breakHeight(bp){
    bp == 'xs' ? y = 250 : y = 500;
    return y;
}


// funciton to determine the century of the datapoint when displaying the tooltip
function century(x){
    x<100 ? y = '19'+x : y = '20'+(x.toString().substring(1));
    return y;
}

// function to ensure the tip doesn't hang off the side
function tipX(x){
    var winWidth = $(window).width();
    var tipWidth = $('.tip').width();
    if (breakpoint == 'xs'){
        x > winWidth - tipWidth - 20 ? y = x-tipWidth : y = x;
    } else {
        x > winWidth - tipWidth - 30 ? y = x-45-tipWidth : y = x+10;
    }
    return y;
}

// function to create the chart


function initStreamGraph() {
    // basic chart dimensions
    var margin = {top: 20, right: 1, bottom: 30, left: 0};
    var width = $('.chart-wrapper').width() - margin.left - margin.right;
    var height = breakHeight(breakpoint) - margin.top - margin.bottom;

    // chart top used for placing the tooltip
    var chartTop = $(chartInd).offset().top;

    // tooltip
    var tooltip = d3.select("body")
        .append("div")
        .attr("class", "tip")
        .style("position", "absolute")
        .style("z-index", "20")
        .style("visibility", "hidden")
        .style("top", 40+chartTop+"px");

    // scales:
    // x is a time scale, for the horizontal axis
    // y is a linear (quantitative) scale, for the vertical axis
    // z is in ordinal scale, to determine the colors (see var colorrange, below)
    let x = d3.time.scale()
        .range([0, width]);

    let y = d3.scale.linear()
        .range([height-10, 0]);

    // color range provided by colorbrewer
    // i just added a bunch of grays at the end so that the categories grouped as other all appear gray.
    // there's definitely a better way to do this


    // the x-axis. note that the ticks are years, and we'll show every 5 years
    let xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .ticks(d3.timeYears, yearInterval);

    // stacked layout. the order is reversed to get the largest value on top
    // if you change the order to inside-out, the streams get all mixed up and look cool
    // but the graph is harder to read. reversed order ensures that the streams are in the
    // same order as the legend, which improves readability in lieu of directly labelling
    // the streams (which is another programming challenge entirely)
    let stack = d3.layout.stack()
        .offset("silhouette")
        .order("reverse")
        .values(function(d) { return d.values; })
        .x(function(d) { return d.date; })
        .y(function(d) { return d.value; });

    let nest = d3.nest()
        .key(function(d) { return d.key; })
        .sortKeys(function(k1, k2){
            return k1.localeCompare(k2)
        })
        .sortValues(function(v1, v2){
            return v1['date'].getFullYear() - v2['date'].getFullYear()
        });

    // there are some ways other than "basis" to interpolate the area between data points
    // for example, you can use "cardinal", which makes the streams a little more wiggly.
    // the drawback with that approach is that if you have years where there is no data,
    // you won't see a flat line across the center of the chart. instead, it will look all bumpy.
    // ultimately, "cardinal" interpolation is more likely to give an inaccurate represenation of the data,
    // which is anyway a danger with any type of interpolation, including "basis"
    let area = d3.svg.area()
        .interpolate("basis")
        .x(function(d) { return x(d.date); })
        .y0(function(d) { return y(d.y0)-.2; }) // -.2 to create a little space between the layers
        .y1(function(d) { return y(d.y0 + d.y)+.2; }); // +.2, likewise

    let svg = d3.select(chartInd).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // generate a legend
    function legend(){

        let legendTitle = 'EventType';

        $(chartInd).prepend('<div class="legend"><div class="title">'+legendTitle+'</div></div>');
        $('.legend').hide();
        var legend = []
        eventL1CodeNames.forEach(function(d,i){
            var obj = {};
            obj.key = d;
            obj.color = itemColorRange[d];
            legend.push(obj);
        });

        // others
        // if (layers.length>7){legend.push({key: "Other",color: "#b3b3b3"});}

        legend.forEach(function(d,i){
            $(chartInd +' .legend').append('<div class="item"><div class="swatch" style="background: '+d.color+'"></div>'
                + d.key + ': ' + eventCodes[d.key]
                + '</div>');
        });

        $('.legend').fadeIn();
        // end legend function
    }
    // our legend is based on our layers
    legend();

    var vertical = d3.select(chartInd)
        .append("div")
        .attr("class", "remove")
        .style("position", "absolute")
        .style("z-index", "19")
        .style("width", "2px")
        .style("height", "460px")
        .style("top", "10px")
        .style("bottom", "30px")
        .style("left", "0px")
        .style("background", "#fcfcfc");

    function drawStreamGraph(countryPair) {
        svg.selectAll(".layer").remove();
        svg.selectAll("g").remove();
        svg.selectAll("rect").remove();

        let data = parseStreamData(countryPair);

        // now we call the data, as the rest of the code is dependent upon data
        // generate our layers
        var layers = stack(nest.entries(data));



        // set the domains
        x.domain(d3.extent(data, function(d) { return d.date; }));
        y.domain([0, d3.max(data, function(d) { return d.y0 + d.y; })]);

        // and now we're on to the data joins and appending
        svg.selectAll(".layer")
            .data(layers)
            .enter().append("path")
            .attr("class", "layer")
            .attr("d", function(d) { return area(d.values); })
            .style("fill", function(d, i) { return itemColorRange[d.key]; });

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        // abbreviate axis tick text on small screens
        if (breakpoint == 'xs') {

            $('.x.axis text').each(function(){
                var curTxt = $(this).text();
                var newTxt = "'"+curTxt.substr(2);
                $(this).text(newTxt);
            });

        }

        // user interaction with the layers
        // function to decide whether to pluralize the word "award" in the tooltip
        function awardPlural(x){
            let y;
            x == 1 ? y = 'event' : y = 'events';
            return y;
        }

        svg.selectAll(".layer")
            .attr("opacity", 1)
            .on("mouseover", function(d, i) {
                svg.selectAll(".layer").transition()
                    .duration(100)
                    .attr("opacity", function(d, j) {
                        return j != i ? 0.6 : 1;
                    })})
            .on("mousemove", function(d, i) {

                var color = d3.select(this).style('fill'); // need to know the color in order to generate the swatch

                mouse = d3.mouse(this);
                mousex = mouse[0];
                var invertedx = x.invert(mousex);
                var xDate = century(invertedx.getYear());
                d.values.forEach(function(f){
                    var year = (f.date.toString()).split(' ')[3];
                    if (xDate == year){
                        tooltip
                            .style("left", tipX(mousex) +"px")
                            .html( "<div class='year'>" + year + "</div><div class='key'><div style='background:" + color + "' class='swatch'>&nbsp;</div>"
                                + f.key + ': ' + eventCodes[f.key]
                                + "</div><div class='value'>" + f.value + " " + awardPlural((f.value)) + "</div>" )
                            .style("visibility", "visible");
                    }
                });
            })
            .on("mouseout", function(d, i) {
                svg.selectAll(".layer").transition()
                    .duration(100)
                    .attr("opacity", '1');
                tooltip.style("visibility", "hidden");
            });        // vertical line to help orient the user while exploring the streams

        d3.select(chartInd)
            .on("mousemove", function(){
                mousex = d3.mouse(this);
                mousex = mousex[0] + 5;
                vertical.style("left", mousex + "px" )})
            .on("mouseover", function(){
                mousex = d3.mouse(this);
                mousex = mousex[0] + 5;
                vertical.style("left", mousex + "px")});

        // Add 'curtain' rectangle to hide entire graph
        var curtain = svg.append('rect')
            .attr('x', -1 * width)
            .attr('y', -1 * height)
            .attr('height', height)
            .attr('width', width)
            .attr('class', 'curtain')
            .attr('transform', 'rotate(180)')
            .style('fill', '#fcfcfc')

        // Create a shared transition for anything we're animating
        var t = svg.transition()
            .delay(10)
            .duration(100)
            .ease('exp')
            .each('end', function() {
                d3.select('line.guide')
                    .transition()
                    .style('opacity', 0)
                    .remove()
            });

        t.select('rect.curtain')
            .attr('width', 0);
        t.select('line.guide')
            .attr('transform', 'translate(' + width + ', 0)');
    }

    return drawStreamGraph;
}

