var sunburstInd = '#sunburstChart';

var Color = net.brehaut.Color;

function gdColorRange(event) {
    if (event === "root") {
        return NaN;
    }
    if (event in itemColorRange) {
        return itemColorRange[event];
    } else {
        let baseEvent = event.substring(0,2);
        let baseEventCount = subEventCount[baseEvent];
        let baseColor = Color(itemColorRange[baseEvent]);
        let ratio = (parseInt(event.substring(2)) % baseEventCount) / baseEventCount;
        let turnedColor = baseColor.lightenByRatio(ratio);
        return turnedColor.toString();
    }
}

function parseSunburstData(countryPair) {
    let output = [];
    if ( ! (countryPair in sunburstChartData))
        return output;

    let record = sunburstChartData[countryPair];
    let counts = record.slice(2);
    for (let cind in counts) {
        let eventCode = eventCodeNames[cind];
        if (!(eventCode in eventL1Codes)) {
            let str = '';
            for (let lind = 1; lind <= eventLevels[eventCode]; lind++) {
                if (lind !== 1) str += '-';
                str += eventCode.substr(0, lind + 1);
            }
            output.push([
                str,
                parseInt(counts[cind]),
            ])
        }
    }
    return output;
}

function initSunburstChart() {
    // Dimensions of sunburst.
    let width = 750;
    let height = 600;
    let radius = Math.min(width, height) / 2;

    // Breadcrumb dimensions: width, height, spacing, width of tip/tail.
    let b = {
        w: 75, h: 30, s: 3, t: 10
    };

    // Total size of all segments; we set this later, after loading the data.
    let totalSize = 0;

    let vis = d3.select(sunburstInd).select("#chart").append("svg:svg")
        .attr("width", width)
        .attr("height", height)
        .append("svg:g")
        .attr("id", "container")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    let partition = d3.layout.partition()
        .size([2 * Math.PI, radius * radius])
        .value(function (d) {
            return d.size;
        }).sort(function(v1, v2){
            // sort by value
            v1['name'].localeCompare(v2['name'])
        });

    let arc = d3.svg.arc()
        .startAngle(function (d) {
            return d.x;
        })
        .endAngle(function (d) {
            return d.x + d.dx;
        })
        .innerRadius(function (d) {
            return Math.sqrt(d.y);
        })
        .outerRadius(function (d) {
            return Math.sqrt(d.y + d.dy);
        });

    function drawLegend() {

        // Dimensions of legend item: width, height, spacing, radius of rounded rect.
        let li = {
            w: 75, h: 30, s: 3, r: 3
        };

        let legend = d3.select("#legend").append("svg:svg")
            .attr("width", li.w)
            .attr("height", d3.keys(itemColorRange).length * (li.h + li.s));

        let g = legend.selectAll("g")
            .data(d3.entries(itemColorRange))
            .enter().append("svg:g")
            .attr("transform", function (d, i) {
                return "translate(0," + i * (li.h + li.s) + ")";
            });

        g.append("svg:rect")
            .attr("rx", li.r)
            .attr("ry", li.r)
            .attr("width", li.w)
            .attr("height", li.h)
            .style("fill", function (d) {
                return d.value;
            });

        g.append("svg:text")
            .attr("x", li.w / 2)
            .attr("y", li.h / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .text(function (d) {
                return d.key;
            });
    }
    drawLegend();

    // Use d3.text and d3.csv.parseRows so that we do not need to have a header
    // row, and can receive the csv as an array of arrays.

    // Main function to draw and set up the visualization, once we have the data.
    function drawSunburstChart(countryPair) {
        vis.selectAll('svg').remove();
        vis.selectAll('path').remove();

        // todo: remove previous elements
        let json = buildHierarchy(parseSunburstData(countryPair));

        // Basic setup of page elements.
        initializeBreadcrumbTrail();
        d3.select("#togglelegend").on("click", toggleLegend);

        // Bounding circle underneath the sunburst, to make it easier to detect
        // when the mouse leaves the parent g.
        vis.append("svg:circle")
            .attr("r", radius)
            .style("opacity", 0);

        // For efficiency, filter nodes to keep only those large enough to see.
        let nodes = partition.nodes(json)
            .filter(function (d) {
                return (d.dx > 0.005); // 0.005 radians = 0.29 degrees
            });

        let path = vis.data([json]).selectAll("path")
            .data(nodes)
            .enter().append("svg:path")
            .attr("display", function (d) {
                return d.depth ? null : "none";
            })
            .attr("d", arc)
            .attr("fill-rule", "evenodd")
            .style("fill", function (d) {
                return gdColorRange(d.name);
            })
            .style("opacity", 1)
            .on("mouseover", mouseover);

        // Add the mouseleave handler to the bounding circle.
        d3.select("#container").on("mouseleave", mouseleave);

        // Get total size of the tree = value of root node from partition.
        totalSize = path.node().__data__.value;
    }

// Fade all but the current sequence, and show it in the breadcrumb trail.
    function mouseover(d) {

        let percentage = (100 * d.value / totalSize).toPrecision(3);
        let percentageString = percentage + "%";
        if (percentage < 0.1) {
            percentageString = "< 0.1%";
        }


        d3.select("#percentage")
            .text(percentageString);

        d3.select('#number')
            .text(d.value);

        d3.select(sunburstInd).select('#description')
            .text(d.name + ': ' + eventCodes[d.name]);

        d3.select("#explanation")
            .style("visibility", "");

        let sequenceArray = getAncestors(d);
        updateBreadcrumbs(sequenceArray, percentageString);

        // Fade all the segments.
        d3.select(sunburstInd).selectAll("path")
            .style("opacity", 0.3);

        // Then highlight only those that are an ancestor of the current segment.
        vis.selectAll("path")
            .filter(function (node) {
                return (sequenceArray.indexOf(node) >= 0);
            })
            .style("opacity", 1);
    }

// Restore everything to full opacity when moving off the visualization.
    function mouseleave(d) {

        // Hide the breadcrumb trail
        d3.select("#trail")
            .style("visibility", "hidden");

        // Deactivate all segments during transition.
        d3.select(sunburstInd).selectAll("path").on("mouseover", null);

        // Transition each segment to full opacity and then reactivate it.
        d3.select(sunburstInd).selectAll("path")
            .transition()
            .duration(1000)
            .style("opacity", 1)
            .each("end", function () {
                d3.select(this).on("mouseover", mouseover);
            });

        d3.select("#explanation")
            .style("visibility", "hidden");
    }

// Given a node in a partition layout, return an array of all of its ancestor
// nodes, highest first, but excluding the root.
    function getAncestors(node) {
        let path = [];
        let current = node;
        while (current.parent) {
            path.unshift(current);
            current = current.parent;
        }
        return path;
    }

    function initializeBreadcrumbTrail() {
        // Add the svg area.
        let trail = d3.select("#sequence").append("svg:svg")
            .attr("width", width)
            .attr("height", 50)
            .attr("id", "trail");
        // Add the label at the end, for the percentage.
        trail.append("svg:text")
            .attr("id", "endlabel")
            .style("fill", "#000");
    }

// Generate a string that describes the points of a breadcrumb polygon.
    function breadcrumbPoints(d, i) {
        let points = [];
        points.push("0,0");
        points.push(b.w + ",0");
        points.push(b.w + b.t + "," + (b.h / 2));
        points.push(b.w + "," + b.h);
        points.push("0," + b.h);
        if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
            points.push(b.t + "," + (b.h / 2));
        }
        return points.join(" ");
    }

// Update the breadcrumb trail to show the current sequence and percentage.
    function updateBreadcrumbs(nodeArray, percentageString) {

        // Data join; key function combines name and depth (= position in sequence).
        let g = d3.select("#trail")
            .selectAll("g")
            .data(nodeArray, function (d) {
                return d.name + d.depth;
            });

        // Add breadcrumb and label for entering nodes.
        let entering = g.enter().append("svg:g");

        entering.append("svg:polygon")
            .attr("points", breadcrumbPoints)
            .style("fill", function (d) {
                return gdColorRange(d.name);
            });

        entering.append("svg:text")
            .attr("x", (b.w + b.t) / 2)
            .attr("y", b.h / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .text(function (d) {
                return d.name;
            });

        // Set position for entering and updating nodes.
        g.attr("transform", function (d, i) {
            return "translate(" + i * (b.w + b.s) + ", 0)";
        });

        // Remove exiting nodes.
        g.exit().remove();

        // Now move and update the percentage at the end.
        d3.select("#trail").select("#endlabel")
            .attr("x", (nodeArray.length + 0.5) * (b.w + b.s))
            .attr("y", b.h / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .text(percentageString);

        // Make the breadcrumb trail visible, if it's hidden.
        d3.select("#trail")
            .style("visibility", "");

    }



    function toggleLegend() {
        let legend = d3.select("#legend");
        if (legend.style("visibility") == "hidden") {
            legend.style("visibility", "");
        } else {
            legend.style("visibility", "hidden");
        }
    }

// Take a 2-column CSV and transform it into a hierarchical structure suitable
// for a partition layout. The first column is a sequence of step names, from
// root to leaf, separated by hyphens. The second column is a count of how
// often that sequence occurred.
    function buildHierarchy(csv) {
        let root = {"name": "root", "children": []};
        for (let i = 0; i < csv.length; i++) {
            let sequence = csv[i][0];
            let size = +csv[i][1];
            if (isNaN(size)) { // e.g. if this is a header row
                continue;
            }
            let parts = sequence.split("-");
            let currentNode = root;
            for (let j = 0; j < parts.length; j++) {
                let children = currentNode["children"];
                let nodeName = parts[j];
                let childNode;
                if (j + 1 < parts.length) {
                    // Not yet at the end of the sequence; move down the tree.
                    let foundChild = false;
                    for (let k = 0; k < children.length; k++) {
                        if (children[k]["name"] == nodeName) {
                            childNode = children[k];
                            foundChild = true;
                            break;
                        }
                    }
                    // If we don't already have a child node for this branch, create it.
                    if (!foundChild) {
                        childNode = {"name": nodeName, "children": []};
                        children.push(childNode);
                    }
                    currentNode = childNode;
                } else {
                    // Reached the end of the sequence; create a leaf node.
                    childNode = {"name": nodeName, "size": size};
                    children.push(childNode);
                }
            }
        }
        return root;
    };

    return drawSunburstChart;
}