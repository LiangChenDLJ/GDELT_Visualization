var eventCodes;
var eventLevels;
var eventCodeNames;
var eventL1Codes;
var eventL1CodeNames;
var countryCodes;
var countryCodeNames;
var reversedCountryCodes;
var goldsteinData;
var subEventCount;

var streamGraphData;
var sunburstChartData;

var itemColorRange = {
    '01': "#800000",
    '02': "#9A6324",
    '03': "#808000",
    '04': "#469990",
    '05': "#000075",
    '06': "#444444",
    '07': "#E6194B",
    '08': "#F58231",
    '09': "#FFE119",
    '10': "#BFEF45",
    '11': "#3CB44B",
    '12': "#42D4F4",
    '13': "#4363D8",
    '14': "#911EB4",
    '15': "#F032E6",
    '16': "#A9A9A9",
    '17': "#FABEBE",
    '18': "#FFD8B1",
    '19': "#FFFAC8",
    '20': "#AAFFC3"
};

function initCharts() {

    // draw everything
    let drawStreamGraph = initStreamGraph();
    let drawSunburstChart = initSunburstChart();

    function updateGraphs(){
        let country1Code = reversedCountryCodes[$('#streamGraphBtn1').val()];
        let country2Code = reversedCountryCodes[$('#streamGraphBtn2').val()];
        drawStreamGraph(country1Code + ',' + country2Code);
        drawSunburstChart(country1Code + ',' + country2Code);
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
                subEventCount = {};
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
                        subEventCount[eventCode] = 0;
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
                    if (eventLevels[eventCode] > 1) {
                        subEventCount[eventCode.substring(0,2)] += 1;
                    }
                }
                console.log('eventCodes', eventCodes);
                console.log('eventL1Codes', eventL1Codes);
                console.log('eventL1CodeNames', eventL1CodeNames);
                console.log('eventLevels', eventLevels);

                // read stream_graph_data
                streamGraphData = {};
                let stream_data = d3.tsv.parseRows(stream_text);
                for (let ind in stream_data) {
                    let record = stream_data[ind];
                    let countryPair = record[1] + ',' + record[2];
                    if (!(countryPair in streamGraphData)) {
                        streamGraphData[countryPair] = [];
                    }
                    streamGraphData[countryPair].push(record);
                }
                // console.log('streamGraphData', streamGraphData);

                // read sunburst_chart_data
                sunburstChartData = {};
                let sunburst_data = d3.tsv.parseRows(pie_text);
                for (let ind in sunburst_data) {
                    let record = sunburst_data[ind];
                    let countryPair = record[0] + ',' + record[1];
                    sunburstChartData[countryPair] = record;
                }

                console.log('sunburstChartData', sunburstChartData);

                // goldstein
                goldsteinData = {};
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