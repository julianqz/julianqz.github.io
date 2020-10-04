// set up SVG
var w = 800;
var h = 500;

// paddings for left, right, top, bottom
var pdL = 50;
var pdR = 20;
var pdT = 50;
var pdB = 100;

// for debugging
//var dataset = [ 5, 10, 13, 19, 21, 25, 22, 18, 15, 13,
//                11, 12, 15, 20, 18, 17, 16, 18, 23, 25 ];

// global var for data
var dataset;
var datasetR;

var rowConverter = function(d) {
    return {
        // time,a,b,c
        time: parseInt(d["time"]),
        a: parseInt(d["a"]),
        b: parseInt(d["b"]),
        c: parseInt(d["c"])
    };
};

// read in csv
// https://github.com/d3/d3-fetch/blob/v1.1.2/README.md#csv
var nameCSV = "data_barinput.csv"
d3.csv(nameCSV, rowConverter, function(error, data){

    if (error) {
        console.log(error);
    } else {
        dataset = data;
        //console.log(dataset);

        // reshape data
        // row: time, group (a/b/c), value
        datasetR = [];
        for (i=0; i<dataset.length; i++) {
            var curTime = dataset[i]["time"];
            datasetR.push({ time:curTime, group:"a", val:dataset[i]["a"] });
            datasetR.push({ time:curTime, group:"b", val:dataset[i]["b"] });
            datasetR.push({ time:curTime, group:"c", val:dataset[i]["c"] });
        };

        // clustered columns, bar width and padding
        // each bar gets a standard amount of padding 
        // a bar from group "c" gets an additional amount of padding (except for last bar)
        var barPd_clust_add = 20;
        var barPd_clust_std = 5;
        // number of clusters: dataset.length
        // number of bars: datasetR.length
        var nClust = dataset.length;
        var barW_clust = ( w - pdL - pdR - barPd_clust_add*(nClust-1) - 
                           barPd_clust_std*datasetR.length ) / datasetR.length;
        //console.log("barW_clust: "+barW_clust);   


        // stacked bars
        var barW_stack = 25;

        // scale functions

        var scaleY = d3.scaleLinear()
                             .domain( [ 0, d3.max(datasetR, function(d){return d["val"];}) ] )
                             .range( [h-pdB, pdT] );    

        var scaleX_clust_helper = function(idx) {
          var nClustToLeft = Math.floor(idx/3);
          var nBarsToLeft = idx;
          var curX = nBarsToLeft*(barW_clust+barPd_clust_std) + 
                     nClustToLeft*barPd_clust_add + pdL;
          //console.log(idx, nClustToLeft, nBarsToLeft, curX);
          return curX; 
        };      

        var scaleX = d3.scaleLinear()
                             .domain( [1, dataset.length] )
                             .range( [ scaleX_clust_helper(1), 
                                       scaleX_clust_helper(datasetR.length-2) ] ); 

        var scaleY_stack_helper = function(idx) {
            if (idx % 3 === 0) {
                return datasetR[idx]["val"];
            } else if (idx % 3 === 1) {
                return datasetR[idx]["val"]+datasetR[idx-1]["val"];
            } else if (idx % 3 === 2) {
                return datasetR[idx]["val"]+datasetR[idx-1]["val"]+datasetR[idx-2]["val"];
            }
        };

        var scaleY_stackNorm_helper = function(idx) { 
            if (idx % 3 === 0) {
                var curSum = datasetR[idx]["val"]+datasetR[idx+1]["val"]+datasetR[idx+2]["val"];
                return datasetR[idx]["val"]/curSum*100;
            } else if (idx % 3 === 1) {
                var curSum = datasetR[idx-1]["val"]+datasetR[idx]["val"]+datasetR[idx+1]["val"];
                return (datasetR[idx]["val"]+datasetR[idx-1]["val"])/curSum*100;
            } else if (idx % 3 === 2) {
                return 100;
            }
        };

        // axes
        var axisY = d3.axisLeft()
                      .scale(scaleY);    

        var axisX = d3.axisBottom()
                      .scale(scaleX);
    

        // color
        var pickCol = function(grp) {
            if (grp==="a") {
                return "blue";
            } else if (grp==="b") {
                return "DarkOrange";
            } else if (grp==="c") {
                return "Gray";
            }
        };

        // initiate SVG
        var svg = d3.select("body")
                    .append("svg")
                    .attr("width", w)
                    .attr("height", h);

        // initiaze with clustered columns
        svg.selectAll("rect")
           .data(datasetR)
           .enter()
           .append("rect")
           .attr("x", function(d, i) {
                return scaleX_clust_helper(i);
           })
           .attr("y", function(d) {
                return scaleY(d["val"]);
           })
           .attr("width", barW_clust)
           .attr("height", function(d) {
                return h-pdB-scaleY(d["val"]);
           })
           .attr("fill", function(d) {
                return pickCol(d["group"]);
           } );

        // x-axis
        // vertically, push down by h-pdB+5
        svg.append("g")
           .attr("class", "axis_x")
           .attr("transform", "translate("+0+","+(h-pdB+5)+")")
           .call(axisX);
        // y-axis
        // horiztonally, push it to the right by pdL-15
        svg.append("g")
           .attr("class", "axis_y")
           .attr("transform", "translate(" + (pdL-15) + "," + 0 + ")")
           .call(axisY);

        // title
        var txt_constant = " (click anywhere on SVG for transition)";
        svg.append("text")
           .text("Clustered Column" + txt_constant)
           .attr("class", "title")
           .attr("x", w/2)
           .attr("y", pdT/2);

        // legend
        var hLegend = h-pdB/3;
        var wLegend = 10;
        svg.append("rect")
           .attr("x", w/2-50-25)
           .attr("y", hLegend*0.98)
           .attr("width", wLegend)
           .attr("height", wLegend)
           .attr("fill", pickCol("a"));
        svg.append("text")
           .text("a")
           .attr("class", "lab")
           .attr("x", w/2-50)
           .attr("y", hLegend);
        svg.append("rect")
           .attr("x", w/2-25)
           .attr("y", hLegend*0.98)
           .attr("width", wLegend)
           .attr("height", wLegend)
           .attr("fill", pickCol("b"));
        svg.append("text")
           .text("b")
           .attr("class", "lab")
           .attr("x", w/2)
           .attr("y", hLegend);
        svg.append("rect")
           .attr("x", w/2+25)
           .attr("y", hLegend*0.98)
           .attr("width", wLegend)
           .attr("height", wLegend)
           .attr("fill", pickCol("c"));
        svg.append("text")
           .text("c")
           .attr("class", "lab")
           .attr("x", w/2+50)
           .attr("y", hLegend);

        // transitions

        var pageNum = 0;

        d3.select("body")
          .on("click", function() {

          pageNum = pageNum+1;

          if (pageNum % 3 === 0) {
              //console.log("cluster");

              // update scales
              scaleX.range( [ scaleX_clust_helper(1), 
                              scaleX_clust_helper(datasetR.length-2) ] );
              scaleY.domain( [ 0, d3.max(datasetR, function(d){return d["val"];}) ] );

              // clustered columns
              svg.selectAll("rect")
                 .data(datasetR)
                 .transition()
                 .duration(1500)
                 .attr("x", function(d, i) {
                      return scaleX_clust_helper(i);
                 })
                 .attr("y", function(d) {
                      return scaleY(d["val"]);
                 })
                 .attr("width", barW_clust)
                 .attr("height", function(d) {
                      return h-pdB-scaleY(d["val"]);
                 })
                 .attr("fill", function(d) {
                      return pickCol(d["group"]);
                 } );

              // x-axis
              svg.select(".axis_x")
                 .transition()
                 .duration(1500)
                 .attr("transform", "translate("+0+","+(h-pdB+5)+")")
                 .call(axisX);

              // title
              svg.select(".title")
                 .transition()
                 .text("Clustered Column" + txt_constant);

          } else if (pageNum % 3 === 1) {
              //console.log("stacked");

              // update scales
              scaleX.range( [ pdL, w-pdR-barW_stack ] );
              scaleY.domain( [0, d3.max(dataset, function(d){ return d["a"]+d["b"]+d["c"]; } )] );

              // stacked column
              svg.selectAll("rect")
                 .data(datasetR)
                 .transition()
                 .duration(1500)
                 .attr("x", function(d) {
                      return scaleX(d["time"]);
                 })
                 .attr("y", function(d, i) {
                      var curY = scaleY_stack_helper(i);
                      //console.log(curY);
                      return scaleY(curY);
                 })
                 .attr("width", barW_stack)
                 .attr("height", function(d, i) {
                      if (i % 3 === 0) {
                          return h-pdB-scaleY(scaleY_stack_helper(i));
                      } else {
                          var curY = scaleY_stack_helper(i);
                          var preY = scaleY_stack_helper(i-1);
                          return scaleY(preY)-scaleY(curY);
                      }
                 })
                 .attr("fill", function(d) {
                      return pickCol(d["group"]);
                 } );

              // x-axis
              svg.select(".axis_x")
                 .transition()
                 .duration(1500)
                 .attr("transform", "translate("+12+","+(h-pdB+5)+")")
                 .call(axisX);

              // title
              svg.select(".title")
                 .transition()
                 .text("Stacked Column" + txt_constant);

          } else if (pageNum % 3 === 2) {
              //console.log("normalized stacked");

              // update scales
              scaleY.domain( [0, 100] );

              // 100% stacked column
              svg.selectAll("rect")
                 .data(datasetR)
                 .transition()
                 .duration(1500)
                 .attr("x", function(d) {
                      return scaleX(d["time"]);
                 })
                 .attr("y", function(d, i) {
                      var curY = scaleY_stackNorm_helper(i);
                      //console.log(curY);
                      return scaleY(curY);
                 })
                 .attr("width", barW_stack)
                 .attr("height", function(d, i) {
                      if (i % 3 === 0) {
                          return h-pdB-scaleY(scaleY_stackNorm_helper(i));
                      } else {
                          var curY = scaleY_stackNorm_helper(i);
                          var preY = scaleY_stackNorm_helper(i-1);
                          return scaleY(preY)-scaleY(curY);
                      }
                 })
                 .attr("fill", function(d) {
                      return pickCol(d["group"]);
                 } );

              // x-axis
              svg.select(".axis_x")
                 .transition()
                 .duration(1500)
                 .attr("transform", "translate("+12+","+(h-pdB+5)+")")
                 .call(axisX);

              // title
              svg.select(".title")
                 .transition()
                 .text("100% Stacked Column" + txt_constant);

          }

          // update y-axis
          svg.select(".axis_y")
             .transition()
             .duration(1500)
             .call(axisY);

        });

    }

});
