// set up SVG
var w = 1400;
var h = 800;

// paddings for left, right, top, bottom
var pdH1 = 200;
var pdH2 = 50;
var pdH3 = 200;
var pdH4 = 50;

var wPlot = (w-pdH1-pdH2-pdH3-pdH4)/2;

var pdT = 80;
var pdB = 50;

// horizontal paddings
// |  |          |  |  |          |  |
// |  |          |  |  |          |  |
// |  |          |  |  |          |  |
//  H1            H2 H3            H4
//      (w-H*)/2         (w-H*)/2

// for debugging
//var dataset = [ 5, 10, 13, 19, 21, 25, 22, 18, 15, 13,
//                11, 12, 15, 20, 18, 17, 16, 18, 23, 25 ];

// global var for data
var dataset;
var datasetSorted;

// function to create SVG path statement from a list of points
var lineGenerator = d3.line();

var rowConverter = function(d) {
    return {
      Type: d.Type,
      t5yr: parseFloat(d.t5yr),
      t10yr: parseFloat(d.t10yr),
      t15yr: parseFloat(d.t15yr),
      t20yr: parseFloat(d.t20yr),
      t5se: parseFloat(d.t5se),
      t10se: parseFloat(d.t10se),
      t15se: parseFloat(d.t15se),
      t20se: parseFloat(d.t20se)
    };
};

// read in csv
// https://github.com/d3/d3-fetch/blob/v1.1.2/README.md#csv
d3.csv("data_cancer_survival.csv", rowConverter, function(error, data){

    if (error) {
        console.log(error);
    } else {
        dataset = data;
        //console.log(dataset);

        // sort data by t5yr
        // https://raddevon.com/articles/sort-array-numbers-javascript/
        // https://stackoverflow.com/questions/3730510/javascript-sort-array-and-return-an-array-of-indicies-that-indicates-the-positi
        var idxSorted = new Array(dataset.length);
        for (var i=0; i<dataset.length; i++) {
            idxSorted[i] = i;
        }
        // descending order
        var sortHelper = function(a, b) {
            if (dataset[a]["t5yr"] > dataset[b]["t5yr"]) {
                return -1;
            } else if (dataset[a]["t5yr"] < dataset[b]["t5yr"]) {
                return 1;
            } else {
                return 0;
            }
        };
        idxSorted.sort(sortHelper)
        // for debugging
        //for (var j=0; j<idxSorted.length; j++) { console.log(dataset[idxSorted[j]]["t5yr"]) };

        var dataSorted = [];
        for (var i=0; i<idxSorted.length; i++) {
            dataSorted.push( dataset[ idxSorted[i] ] );
        };
        // going global
        datasetSorted = dataSorted;

        // pick color
        var pickCol = function(idx) {
            // alternate opponent colors
            // avoid one of red and green to be mindful of color blindness
            // avoid white as it won't show up
            // choices: black, blue, yellow, red
            if (idx%4===0) {
                return "black";
            } else if (idx%4===1) {
                return "gold";
            } else if (idx%4===2) {
                return "blue";
            } else if (idx%4===3) {
                return "red";
            }
        };

        // lower and upper bounds for 1st plot and 2nd plot
        // 1st: 5yr starting rate >50
        // 2nd: 5yr starting rate <=50
        // take into account of SE
        var LB_L = [];
        var LB_R = [];
        var UB_L = [];
        var UB_R = [];
        for (var i=0; i<datasetSorted.length; i++) {
            var curD = datasetSorted[i];
            if (curD["t5yr"]>60) {
                // 1st plot
                // upper bound
                UB_L.push( d3.max ( [ curD["t5yr"]+curD["t5se"],
                                      curD["t10yr"]+curD["t10se"],
                                      curD["t15yr"]+curD["t15se"],
                                      curD["t20yr"]+curD["t20se"] ] ) );
                // lower bound
                LB_L.push( d3.min ( [ curD["t5yr"]-curD["t5se"],
                                      curD["t10yr"]-curD["t10se"],
                                      curD["t15yr"]-curD["t15se"],
                                      curD["t20yr"]-curD["t20se"] ] ) ); 
            } else {
                // 2nd plot
                // upper bound
                UB_R.push( d3.max ( [ curD["t5yr"]+curD["t5se"],
                                      curD["t10yr"]+curD["t10se"],
                                      curD["t15yr"]+curD["t15se"],
                                      curD["t20yr"]+curD["t20se"] ] ) );
                // lower bound
                LB_R.push( d3.min ( [ curD["t5yr"]-curD["t5se"],
                                      curD["t10yr"]-curD["t10se"],
                                      curD["t15yr"]-curD["t15se"],
                                      curD["t20yr"]-curD["t20se"] ] ) );
            }
        };

        
        // scale functions
        // 50-100
        scaleX_L = d3.scaleLinear()
                     .domain( [ 1-0.25, 4.25 ] )
                     .range( [ pdH1, pdH1+wPlot ] );
        scaleX_R = d3.scaleLinear()
                     .domain( [ 1-0.25, 4.25 ] )
                     .range( [ pdH1+wPlot+pdH2+pdH3, pdH1+wPlot+pdH2+pdH3+wPlot ] );
        scaleY_L = d3.scaleLinear()
                     //.domain( [50, 100] )
                     .domain( [ d3.min(LB_L)*0.99, d3.max([d3.max(UB_L), 100]) ] )
                     .range( [ h-pdB, pdT ] );
        scaleY_R = d3.scaleLinear()
                     //.domain( [0, 50] )
                     .domain( [ d3.min([0, d3.min(LB_R)]), d3.max([d3.max(UB_R), 60]) ] )
                     .range( [ h-pdB, pdT ] );

        // axes
        var tickValues_X = [1,2,3,4];
        var tickLabels_X = ["5", "10", "15", "20"];
        var axisX_L = d3.axisBottom()
                        .scale(scaleX_L)
                        .tickValues(tickValues_X)
                        .tickFormat(function(d,i){ return tickLabels_X[i]+" yrs"; });
        var axisX_R = d3.axisBottom()
                        .scale(scaleX_R)
                        .tickValues(tickValues_X)
                        .tickFormat(function(d,i){ return tickLabels_X[i]+" yrs"; });

        var tickValues_Y_L = [40,50,60,70,80,90,100];
        var tickValues_Y_R = [0,10,20,30,40,50, 60];
        var axisY_L = d3.axisLeft()
                        .scale(scaleY_L)
                        .tickValues(tickValues_Y_L);
        var axisY_R = d3.axisLeft()
                        .scale(scaleY_R)
                        .tickValues(tickValues_Y_R);
        
        var svg = d3.select("body")
                    .append("svg")
                    .attr("width", w)
                    .attr("height", h);

        // shade
        // TODO: add transparency
        svg.append("rect")
           .attr("class", "shade")
           .attr("x", pdH1)
           .attr("y", pdT)
           .attr("width", wPlot)
           .attr("height", scaleY_L(75)-pdT);

        svg.append("rect")
           .attr("class", "shade")
           .attr("x", pdH1+wPlot+pdH2+pdH3)
           .attr("y", scaleY_R(25))
           .attr("width", wPlot)
           .attr("height", h-pdB-scaleY_R(25));

        // plot
        for (var i=0; i<datasetSorted.length; i++) {
            
            var curD = datasetSorted[i];
            var curCancerY;
            var curCancerX;
            var curVals;
            
            // left or right plot
            if (curD["t5yr"]>60) {
                curCancerY = scaleY_L(curD["t5yr"]);
                curCancerX = pdH1*0.75;
                curVals = [ [ scaleX_L(1), scaleY_L(curD["t5yr"]) ],
                            [ scaleX_L(2), scaleY_L(curD["t10yr"]) ],
                            [ scaleX_L(3), scaleY_L(curD["t15yr"]) ],
                            [ scaleX_L(4), scaleY_L(curD["t20yr"]) ] ];
            } else {
                curCancerY = scaleY_R(curD["t5yr"]);
                curCancerX = pdH1+wPlot+pdH2+pdH3*0.75;
                curVals = [ [ scaleX_R(1), scaleY_R(curD["t5yr"]) ],
                            [ scaleX_R(2), scaleY_R(curD["t10yr"]) ],
                            [ scaleX_R(3), scaleY_R(curD["t15yr"]) ],
                            [ scaleX_R(4), scaleY_R(curD["t20yr"]) ] ];
            }
            //console.log(curVals);

            var curCol = pickCol(i);

            // line
            svg.append("path")
               .attr("d", function(d) {
                  return lineGenerator(curVals);
               } )
               .attr("stroke-width", 3)
               .attr("stroke", curCol)
               .attr("fill", "none");

            // cancer label on y-axis
            svg.append("text")
               .text(curD["Type"])
               .attr("class", "lab")
               .attr("text-anchor", "end")
               .attr("x", curCancerX)
               .attr("y", curCancerY)
               .attr("fill", curCol);
            
            // loop thru years
            // index 1-4 correspond to yrs 5,10,15,20
            // index 5-8 correspond to SE  5,10,15,20
            var jNames = ["t5", "t10", "t15", "t20"];
            for (var j=0; j<4; j++) {
                //console.log(j);
                var curYr = jNames[j]+"yr";
                var curSE = jNames[j]+"se";
                var curLabY;
                var curLabX;
                var curSEscaled;

                if (curD["t5yr"]>60) {
                    // won't work by accessing curD using integer index (e.g. curD[1])
                    curLabY = scaleY_L(curD[curYr]);
                    curLabX = scaleX_L(j+1);
                    curSE_pos = scaleY_L(curD[curYr]+curD[curSE]);
                    curSE_neg = scaleY_L(curD[curYr]-curD[curSE]);
                } else {
                    curLabY = scaleY_R(curD[curYr]);
                    curLabX = scaleX_R(j+1);
                    curSE_pos = scaleY_R(curD[curYr]+curD[curSE]);
                    curSE_neg = scaleY_R(curD[curYr]-curD[curSE]);
                }
                //console.log(curLabX, curLabY);

                // value label
                svg.append("text")
                   .text(Math.round(curD[curYr]))
                   .attr("class", "lab_val")
                   .attr("text-anchor", "start")
                   .attr("x", curLabX+2) // slight rightshift to avoid text obscuring lines
                   .attr("y", curLabY)
                   .attr("fill", curCol);

                // SE
                svg.append("path")
                   .attr("d", function(d) {
                      var coordsSE = [ [ curLabX, curSE_pos ], 
                                       [ curLabX, curSE_neg ] ];
                      console.log(coordsSE);
                      return lineGenerator(coordsSE);
                   } )
                   .attr("stroke-width", 1)
                   .attr("stroke", curCol)
                   .attr("fill", "none");

            };

        };

        // axes
        svg.append("g")
           .attr("class", "axis_x")
           .attr("transform", "translate(0,"+(h-pdB)+")")
           .call(axisX_L);
        svg.append("g")
           .attr("class", "axis_x")
           .attr("transform", "translate(0,"+(h-pdB)+")")
           .call(axisX_R);
        svg.append("g")
           .attr("class", "axis_y")
           .attr("transform", "translate("+pdH1+","+0+")")
           .call(axisY_L);
        svg.append("g")
           .attr("class", "axis_y")
           .attr("transform", "translate("+(pdH1+wPlot+pdH2+pdH3)+","+0+")")
           .call(axisY_R);

        // title
        svg.append("text")
           .text("Cancer Survival Rates")
           .attr("class", "title")
           .attr("x", w/2)
           .attr("y", pdT/3);
        svg.append("text")
           .text("Cancers with 5-year survival rate > 60%")
           .attr("class", "title")
           .attr("x", (pdH1+wPlot+pdH2+pdH3)/2)
           .attr("y", pdT*0.75);
        svg.append("text")
           .text("Cancers with 5-year survival rate <= 60%")
           .attr("class", "title")
           .attr("x", (pdH1+wPlot+pdH2+pdH3)+(wPlot/2))
           .attr("y", pdT*0.75);

    }

});
