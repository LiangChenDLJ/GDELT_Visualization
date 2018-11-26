var ringChartInd = '#ringChart';

// d3.json("data/tweets.json",function(error,data) {dataViz(data.tweets)});

function drawRing(data, radiusRange) {
    var background = d3.select(ringChartInd).select('svg')
        .append('rect')
        .classed('background', true)
        .attr({
            'x': 0,
            'y': 0,
            'height': 500,
            'width': 960
        })
        .style('fill', 'white');

    nestedTweets = data;

    let colorCount = 14;
    let sunlight14 = [
        '#193556',
        '#42A5B3',
        '#E3BA22',
        '#F2DA57',
        '#BD8F22',
        '#E6842A',
        '#F6B656',
        '#BA5F06',
        '#137B80',
        '#42A5B3',
        '#005D6E',
        '#8E6C8A',
        '#B396AD',
        '#684664'
    ]
    var colorScale = d3.scale.ordinal()
        .range(sunlight14);

    newArc = d3.svg.arc();
    newArc.innerRadius(radiusRange[0]).outerRadius(radiusRange[1]);

    pieChartFavs = d3.layout.pie().sort(null);
    pieChartFavs.value(function(d) {return d.value});

    let favedData =pieChartFavs(nestedTweets);

    console.log('favedData', favedData);
    d3.select(ringChartInd).select("svg")
        .append("g")
        .attr("transform","translate(480,250)")
        .selectAll("path")
        .data(favedData, function(d) {return d.data.key})
        .enter()
        .append("path")
        .attr("d", newArc)
        .style("fill", function(d, i) {return colorScale(i % colorCount)})
        .style("opacity", 0)
        .style("stroke", "none")
        .style("stroke-width", "2px")
        .each(function(d) { this._current = d; });


    function animate() {
        d3.select(ringChartInd).selectAll("path")
            .transition()
            .delay(function(d, i) { return i; })
            .duration(500)
            .attrTween('d', function(d) {
                var i = d3.interpolate(d.startAngle+0.1, d.endAngle);
                return function(t) {
                    d.endAngle = i(t);
                    return newArc(d);
                }
            })
            .style('opacity', 1)
    }

    animate();

    d3.select(ringChartInd).select('rect.background').on('click', click);

    function click() {
        d3.select(ringChartInd).selectAll('path')
            .transition()
            .duration(0)
            .style('opacity', 0)
            .call(null, animate())
    }

    function arcTween(a) {
        var i = d3.interpolate(this._current, a);
        this._current = i(0);
        return function(t) {
            return newArc(i(t));
        };

    }
}