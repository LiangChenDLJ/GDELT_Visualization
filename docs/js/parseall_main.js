var eventCodes;
var eventLevels;
var eventCodeNames;
var eventL1Codes;
var eventL1CodeNames;

var countryCodes;
var countryCodeNames;
var reversedCountryCodes;

var goldsteinData;
const itemColorRange = {
    '01': '#1f77b4',
    '02': '#aec7e8',
    '03': '#ff7f0e',
    '04': '#ffbb78',
    '05': '#2ca02c',
    '06': '#98df8a',
    '07': '#d62728',
    '08': '#ff9896',
    '09': '#9467bd',
    '10': '#c5b0d5',
    '11': '#8c564b',
    '12': '#c49c94',
    '13': '#e377c2',
    '14': '#f7b6d2',
    '15': '#7f7f7f',
    '16': '#c7c7c7',
    '17': '#bcbd22',
    '18': '#dbdb8d',
    '19': '#000000',  // special color for conflicts
    '20': '#9edae5',
};
function gdColorRange(event) {
    if (event in goldsteinData) {
        return d3.interpolateRdBu((goldsteinData[event] + 10) / 20);
    } else {
        return itemColorRange[event];
    }
}

var streamGraphData;
var sunburstChartData;

function initCharts() {

    // draw everything
    let drawStreamGraph = initStreamGraph();
    let drawSunburstChart = initSunburstChart();

    function updateGraphs(){
        let country1Code = reversedCountryCodes[$('#streamGraphBtn1').val()];
        let country2Code = reversedCountryCodes[$('#streamGraphBtn2').val()];
        drawStreamGraph(country1Code + ',' + country2Code);
        drawSunburstChart(country1Code + ',' + country2Code);
        // drawStreamGraph('CHN,USA');
    }

    function initSelect(selectInd) {
        d3.select(selectInd).selectAll('option')
            .data(countryCodeNames).enter()
            .append('option')
            .text(function(d) {
                return countryCodes[d];
            });
        $(selectInd).on('changed.bs.select', updateGraphs);
    }

    initSelect('#streamGraphBtn1');
    initSelect('#streamGraphBtn2');
    $('.selectpicker').selectpicker('refresh');

    updateGraphs();

}

(function() {
    d3.queue()
        .defer(d3.tsv, "data/event_code.tsv")
        .defer(d3.tsv, "data/country_code.tsv")
        .defer(d3.text, "data/stream.tsv")
        .defer(d3.text, "data/pie.tsv")
        .defer(d3.text, "data/goldstein.tsv")
        .await(function (error, event_code, country_code, stream_text, pie_text, goldstein_text) {
            if (error) {
                console.error('Oh dear, something went wrong: ' + error);
            } else {
                // read countryCodes
                countryCodes = {};
                reversedCountryCodes = {};
                countryCodeNames = [];
                for (let ind in country_code) {
                    let record = country_code[ind];
                    let countryCode = record['CountryCode'];
                    let countryName = record['CountryName'];
                    countryCodes[countryCode] = countryName;
                    reversedCountryCodes[countryName] = countryCode;
                    countryCodeNames.push(countryCode);
                }
                console.log('countryCodes');
                console.log(countryCodes);

                // read eventCodes
                eventCodes = {};
                eventCodeNames = [];
                eventLevels = {};
                eventL1Codes = {};
                eventL1CodeNames = [];
                //eventL2CodeNames = [];
                for (let ind in event_code) {
                    let event = event_code[ind];
                    let eventCode = event['EventCode'];
                    let eventDescription = event['EventDescription'];
                    eventCodes[eventCode] = eventDescription;
                    eventCodeNames.push(eventCode);
                    if (eventCode.length <= 2) {
                        eventL1Codes[eventCode] = eventDescription;
                        eventL1CodeNames.push(eventCode);
                    }// else {
                    //    eventL2CodeNames.push(eventCode);
                    //}
                    if ((eventCode.length === 3)
                        && (parseInt(ind) + 1 < event_code.length)
                        && (event_code[parseInt(ind) + 1]['EventCode'].length === 4)) {
                        eventLevels[eventCode] = 3;
                    } else {
                        eventLevels[eventCode] = eventCode.length - 1;
                    }
                }
                console.log('eventCodes', eventCodes);
                console.log('eventL1Codes', eventL1Codes);
                console.log('eventL1CodeNames');
                console.log(eventL1CodeNames);

                console.log('eventLevels', eventLevels);
                // read stream_graph_data
                streamGraphData = {};
                let stream_data = d3.tsv.parseRows(stream_text);
                for (let ind in stream_data) {
                    let record = stream_data[ind];
                    let date = record[0];
                    let countryPair = record[1] + ',' + record[2];
                    let counts = record.slice(3, 23);
                    if (!(countryPair in streamGraphData)) {
                        streamGraphData[countryPair] = [];
                    }
                    for (let cind in counts) {
                        streamGraphData[countryPair].push({
                            key: eventL1CodeNames[cind],
                            value: parseInt(counts[cind]),
                            // check if moment works well for month / date
                            date: moment(date, 'YYYY')._d
                        })
                    }
                }
                // console.log('streamGraphData', streamGraphData);

                // read sunburst_chart_data
                sunburstChartData = {};
                let sunburst_data = d3.tsv.parseRows(pie_text);
                for (let ind in sunburst_data) {
                    let record = sunburst_data[ind];
                    let countryPair = record[0] + ',' + record[1];
                    let counts = record.slice(2);
                    if (!(countryPair in sunburstChartData)) {
                        sunburstChartData[countryPair] = [];
                    }
                    for (let cind in counts) {
                        let eventCode = eventCodeNames[cind];
                        if (!(eventCode in eventL1Codes)) {
                            let str = '';
                            for (let lind = 1; lind <= eventLevels[eventCode]; lind++) {
                                if (lind !== 1) str += '-';
                                str += eventCode.substr(0, lind + 1);
                            }
                            sunburstChartData[countryPair].push([
                                str,
                                parseInt(counts[cind]),
                            ])
                        }
                    }
                }

                console.log('sunburstChartData', sunburstChartData);


                // goldstein
                goldsteinData = {}
                let goldstein_data = d3.tsv.parseRows(goldstein_text);

                for (let ind in goldstein_data) {
                    let record = goldstein_data[ind];
                    goldsteinData[record[0]] = parseFloat(record[1]);
                }
                console.log('goldsteinData', goldsteinData);

                initCharts();
            }
        });
})();