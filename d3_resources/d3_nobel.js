// set up SVG
var w = 850;
var h = 850;

// paddings for left, right, top, bottom
var pdL = 70;
var pdR = 100;
var pdT = 50;
var pdB = 50;

// for debugging
//var dataset = [ 5, 10, 13, 19, 21, 25, 22, 18, 15, 13,
//                11, 12, 15, 20, 18, 17, 16, 18, 23, 25 ];

// hard-coded
// female laureates
// up to and incl 2008 (excl literature, peace, and economics) [consistent with CSV]
// manually extracted by cross-referencing 
// https://www.nobelprize.org/prizes/lists/nobel-prize-awarded-women
// against Jones_Weinberg_2011_PNAS.csv
var n_fm = ["Mayer, Maria Goeppert",
            "Curie, Marie", // twice
            "Hodgkin, Dorothy",
            "Joliot-Curie, Irene",
            "Barre-Sinoussi, Francoise",
            "Buck, Linda",
            "Nusslein-Volhard, Christiane",
            "Elion, Gertrude",
            "Levi-Montalcini, Rita",
            "McClintock, Barbara",
            "Yalow, Rosalyn",
            "CoriG, Gerty"];

// global var for data
var dataset;

var rowConverter = function(d) {
    return {
        // name, field, year_birth, year_prize, year_research_mid, 
        // year_death, TheoryOrTheoryAndEmpirical, age_highdegree
        n: d["name"],
        f: d["field"],
        yb: parseInt(d["year_birth"]),
        yp: parseInt(d["year_prize"]),
        yr: parseInt(d["year_research_mid"]),
        yd: parseInt(d["year_death"]),
        // 1 means Theory (or Theory & Empirical);  0 means Empirical
        t: parseInt(d["TheoryOrTheoryAndEmpirical"]),
        // how old the person was when they received their highest degree
        ah: parseInt(d["age_highdegree"]),
        // calculate (yp-yb) - (yr-yb) = yp-yr
        ypMinusR: d["year_prize"]-d["year_research_mid"],
        // placeholder for how many entries with same value before current row
        // initialized with 0
        ypMinusR_count: 0,
        // placeholder for serial number in a given field
        // initialized with 0
        f_sn: 0,
        // place holder for serial number for either t=1 or t=0
        // initialized with 0
        t_sn: 0,
        // gender (0 if M, 1 if F)
        g: n_fm.includes(d["name"])*1
    };
};

// read in csv
// https://github.com/d3/d3-fetch/blob/v1.1.2/README.md#csv
var nameCSV = "data_nobel_Jones_Weinberg_2011_PNAS.csv"
d3.csv(nameCSV, rowConverter, function(error, data){

    if (error) {
        console.log(error);
    } else {
        dataset = data;
        //console.log(dataset);

        // check that all female laureates (n_fm) are in dataset
        //var n_all = [];
        //for (i=0; i<dataset.length; i++) {
        //  n_all.push(dataset[i]["n"]);
        //};

        //for (i=0; i<n_fm.length; i++) {
        //  console.log(i, n_fm[i], n_all.includes(n_fm[i]));
        //};

        // unique values of ypMinusR
        var ypMinusR_uniq = [];
        for (i=0; i<dataset.length; i++) {
            var curVal = dataset[i]["ypMinusR"];
            if (!ypMinusR_uniq.includes(curVal)) {
                ypMinusR_uniq.push(curVal);
            }
        };

        // fill in ypMinusR_count
        // for each unique value of ypMinusR, loop thru rows in dataset
        //     for each row, determine how many rows so far (incl current row) have the current ypMinusR_count
        for (i=0; i<ypMinusR_uniq.length; i++) {
            var curVal = ypMinusR_uniq[i];
            var curCount = 0;
            for (j=0; j<dataset.length; j++) {
                if (dataset[j]["ypMinusR"]===curVal) {
                    //console.log(i, j);
                    curCount = curCount+1;
                    dataset[j]["ypMinusR_count"] = curCount;
                }
            };
        };

        // unique values of ypMinusR
        var field_uniq = [];
        for (i=0; i<dataset.length; i++) {
            var curVal = dataset[i]["f"];
            if (!field_uniq.includes(curVal)) {
                field_uniq.push(curVal);
            }
        };

        // fill in serial number within a field
        for (i=0; i<field_uniq.length; i++) {
            var curVal = field_uniq[i];
            var curCount = 0;
            for (j=0; j<dataset.length; j++) {
                if (dataset[j]["f"]===curVal) {
                    //console.log(i, j);
                    curCount = curCount+1;
                    dataset[j]["f_sn"] = curCount;
                }
            };
        };

        // fill in serial number for a given t
        for (t=0; t<=1; t++) {
            var curCount = 0;
            // fill in by field
            for (j=0; j<field_uniq.length; j++) {
                var curF = field_uniq[j];
                for (k=0; k<dataset.length; k++) {
                    if (dataset[k]["f"]===curF && dataset[k]["t"]===t) {
                        curCount = curCount+1;
                        dataset[k]["t_sn"] = curCount;
                    }
                };
            };
        };


        // max number of points in a field
        var f_sn_max = d3.max(dataset, function(d){return d["f_sn"];})
        // padding btw fields
        var pdF = 60;
        // width for each field (same for each field)
        var wF = (w-pdL-pdR-pdF*field_uniq.length)/field_uniq.length;
        // max number of points per row in each field (same for each field)
        var nMaxPerRow = 10;
        // max number of rows (same for each field; determined by field w/ most points)
        var nRowMax = Math.ceil(f_sn_max / nMaxPerRow);
        // height of label
        var hLab = 50;
        // radius
        var ptR_vis2 = 6;

        var getColByF = function(f) {
            if (f==="Chemistry") {
                return "blue";
            } else if (f==="Physics") {
                return "purple";
            } else if (f==="Medicine") {
                return "green";
            }
        };

        var parseTheo = function(t) {
            // 1 means Theory (or Theory & Empirical);  0 means Empirical
            if (t===1) {
                return "Theory (or Theory & Empirical)";
            } else {
                return "Empirical";
            }
        };

        // max number of points for t=0 or t=1
        var t_sn_max = d3.max(dataset, function(d){return d["t_sn"];})
        // padding btw t
        var pd_t = 50;
        // width for each t (same for each t)
        var w_t = w-pdL-pdR;
        // max number of points per row for each t (same for each t)
        var nMaxPerRow_t = 40;
        // max number of rows (same for each t; determined by t w/ most points)
        var nRowMax_t = Math.ceil(t_sn_max / nMaxPerRow_t);
        // height of label
        var hLab_t = 50;
        // height of region for each t
        var h_t = (h-pdT-pdB-hLab_t*2-pd_t) / 2;
        // radius
        var ptR_vis3 = 6;


        // scale functions

        var scaleX_3 = d3.scaleLinear()
                         .domain( [1, nMaxPerRow_t] )
                         .range( [ pdL, pdL+w_t ] );

        var scaleY_3_t0 = d3.scaleLinear()
                            .domain( [1, nRowMax_t] )  
                            .range( [ pdT+hLab_t, pdT+hLab_t+h_t ] );

        var scaleY_3_t1 = d3.scaleLinear()
                            .domain( [1, nRowMax_t] )  
                            .range( [ pdT+hLab_t+h_t+pd_t+hLab_t, pdT+hLab_t+h_t+pd_t+hLab_t+h_t ] );

        var scaleX_2_chem = d3.scaleLinear()
                              .domain( [1, nMaxPerRow] )
                              .range( [ pdL, pdL+wF ] );
        var scaleX_2_phy = d3.scaleLinear()
                             .domain( [1, nMaxPerRow] )
                             .range( [ pdL+wF+pdF, pdL+wF+pdF+wF ] );
        var scaleX_2_med = d3.scaleLinear()
                             .domain( [1, nMaxPerRow] )
                             .range( [ pdL+wF+pdF+wF+pdF, pdL+wF+pdF+wF+pdF+wF  ] );

        var scaleY_2 = d3.scaleLinear()
                         .domain( [ 1, nRowMax ])
                         .range( [ pdT+hLab, h-pdB ] );


        var scaleX_1 = d3.scaleLinear()
                         .domain( [ d3.min(dataset, function(d){return d["yr"]-d["yb"];})*0.95,
                                    d3.max(dataset, function(d){return d["yr"]-d["yb"];})*1.05 ] )
                         .range( [ pdL, w-pdR ] );
        var scaleY_1 = d3.scaleLinear()
                         .domain( [ d3.min(dataset, function(d){return d["yp"]-d["yb"];})*0.95,
                                    d3.max(dataset, function(d){return d["yp"]-d["yb"];})*1.05 ] )
                         .range( [ h-pdB, pdT ] );

        var scaleX_4 = d3.scaleLinear()
                         .domain( [ d3.min(ypMinusR_uniq), d3.max(ypMinusR_uniq) ] )
                         .range( [ pdL, w-pdR ] );
        var scaleY_4 = d3.scaleLinear()
                         .domain( [ 0, d3.max(dataset, function(d){return d["ypMinusR_count"];})+1 ] )
                         .range( [ h-pdB, pdT ] );

        var scaleX_5 = d3.scaleLinear()
                         .domain( [ 0, dataset.length ] )
                         .range( [ pdL, w-pdR ] );
        var scaleY_5 = d3.scaleLinear()
                         .domain( [ d3.min(dataset, function(d){return d["yd"]-d["yb"];})*0.95,
                                    d3.max(dataset, function(d){return d["yd"]-d["yb"];})*1.05 ] )
                         .range( [ h-pdB, pdT ] );                

        // axes
        var axisY_1 = d3.axisLeft()
                      .scale(scaleY_1);    

        var axisX_1 = d3.axisBottom()
                      .scale(scaleX_1);

        var axisY_4 = d3.axisLeft()
                      .scale(scaleY_4);    

        var axisX_4 = d3.axisBottom()
                      .scale(scaleX_4);

        var axisY_5 = d3.axisLeft()
                      .scale(scaleY_5);    

        var axisX_5 = d3.axisBottom()
                      .scale(scaleX_5);                

        

        // initiate SVG
        var svg = d3.select("body")
                    .append("svg")
                    .attr("width", w)
                    .attr("height", h);

        // landing page
        svg.append("text")
           .text("Click here to start")
           .attr("class", "nav")
           .attr("x", w/2)
           .attr("y", h/2)
           .attr("text-anchor", "middle");
        svg.append("text")
           .text("Use hovering to see additional details")
           .attr("class", "tmp")
           .attr("x", w/2)
           .attr("y", h/2+50)
           .attr("font-size", 20)
           .attr("font-family", "sans-serif")
           .attr("text-anchor", "middle");

        // initiate subsequent pages
        var vis1 = d3.select("svg").append("g").attr("id", "vis1");
        var vis2 = d3.select("svg").append("g").attr("id", "vis2");
        var vis3 = d3.select("svg").append("g").attr("id", "vis3");
        var vis4 = d3.select("svg").append("g").attr("id", "vis4");
        var vis5 = d3.select("svg").append("g").attr("id", "vis5");

        var ptR_vis1 = 2;

        var pageNum = -1;

        d3.select(".nav")
          .on("click", function() {

            pageNum = pageNum+1;

            if (pageNum % 5 === 0) {
                //console.log("0");

                var txt_title = "Vis #1: When to expect your Nobel prize";
                if (pageNum === 0) {
                    // remove hovering instruction
                    svg.select(".tmp").remove();
                    // initialze title
                    svg.append("text").text(txt_title).attr("class", "title").attr("x", w/2).attr("y", pdT/3);
                } else {
                    // update title
                    svg.select(".title").text(txt_title);
                    // remove vis5
                    vis5.selectAll("*")
                        .remove();
                }
                
                svg.select(".nav").text("Click here for vis #2").attr("y", pdT*4/5);


                vis1.selectAll("circle")
                    .data(dataset)
                    .enter()
                    .append("circle")
                    .attr("cx", function(d){return scaleX_1(d["yr"]-d["yb"]);})
                    .attr("cy", function(d){return scaleY_1(d["yp"]-d["yb"]);})
                    .attr("r", ptR_vis1)
                    .attr("fill", function(d){
                        // if female, use a different color
                        if (n_fm.includes(d[["n"]])) {
                            return "red";
                        } else {
                            return "white";
                        }
                    })
                    .attr("stroke", function(d){
                        // if female, no edge
                        if (n_fm.includes(d[["n"]])) {
                            return "transparent";
                        } else {
                            return "black";
                        }
                    })
                    .on("mouseover", function(d) {

                        //Get this point's x/y values, then augment for the tooltip
                        //var xPosition = parseFloat(d3.select(this).attr("cx"));
                        //var yPosition = parseFloat(d3.select(this).attr("cy"));
                        
                        // fixed position: top right conor
                        var xPosition=(w-pdR)*0.8;
                        var yPosition=pdT/3;

                        //Update the tooltip position and value
                        var infoBox = d3.select("#tooltip")
                                        .style("left", xPosition + "px")
                                        .style("top", yPosition + "px");  
                        
                        infoBox.select("#value_1").text(d["n"]);
                        infoBox.select("#value_2").text(d["f"] + " (" + d["yp"] + ")");
                        infoBox.select("#value_3").text("Work: " + (d["yr"]-d["yb"]) 
                                                        + "; prize: " + (d["yp"]-d["yb"]) + " yrs old" );

                        //Show the tooltip
                        d3.select("#tooltip").classed("hidden", false);

                    } )
                    .on("mouseout", function() {
                      //Hide the tooltip
                      d3.select("#tooltip").classed("hidden", true);
                    });

                // one-to-one diagonal line
                vis1.append("line")
                    .attr("x1", scaleX_1(25)).attr("x2", scaleX_1(80))
                    .attr("y1", scaleY_1(25)).attr("y2", scaleY_1(80))
                    .attr("fill", "black")
                    .attr("stroke", "blue")
                    .attr("stroke-dasharray", "10,10");
                vis1.append("text").text("1-to-1").attr("class", "lab").attr("x", scaleX_1(82)).attr("y", scaleY_1(80)).attr("fill", "blue");

                // axes
                vis1.append("g")
                    .attr("class", "axis")
                    .attr("transform", "translate(0," + (h-pdB) + ")")
                    .call(axisX_1);

                vis1.append("g")
                    .attr("class", "axis")
                    .attr("transform", "translate(" + (pdL-10) + "," + 0 + ")")
                    .call(axisY_1);

                // axis labels
                vis1.append("text").text("Age when doing prize-winning work")
                    .attr("class", "lab").attr("x", w/2).attr("y", h-pdB*0.1);
                vis1.append("text").text("Age when winning prize")
                    .attr("class", "lab").attr("x", pdL/4).attr("y", h*0.5)
                    .attr("transform", "rotate(270,"+(pdL/4)+","+(h*0.5)+")");;

                // legend
                vis1.append("text").text("Legend").attr("class", "lab").attr("x", w-pdR).attr("y", (h-pdB)*0.78);
                vis1.append("text").text("Male").attr("class", "lab").attr("x", w-pdR+10).attr("y", (h-pdB)*0.8+20);
                vis1.append("text").text("Female").attr("class", "lab").attr("x", w-pdR+20).attr("y", (h-pdB)*0.8+50);
                vis1.append("circle").attr("cx", (w-pdR)-25).attr("cy", (h-pdB)*0.8+15*1).attr("r", ptR_vis1*2)
                    .attr("fill", "white").attr("stroke", "black");
                vis1.append("circle").attr("cx", (w-pdR)-25).attr("cy", (h-pdB)*0.8+15*3).attr("r", ptR_vis1*2)
                    .attr("fill", "red").attr("stroke", "transparent");


            } else if (pageNum % 5 === 1) {
                //console.log("1");

                // remove vis1
                vis1.selectAll("*")
                    .remove();

                txt_title = "Vis #2: Fields of specialization";
                svg.select(".title").text(txt_title);
                svg.select(".nav").text("Click here for vis #3").attr("y", pdT*4/5);


                vis2.selectAll("circle")
                    .data(dataset)
                    .enter()
                    .append("circle")
                    .attr("cx", function(d){
                        var sn = d["f_sn"];
                        var i_row = Math.ceil(sn/nMaxPerRow);
                        var i_col = (sn-(i_row-1)*nMaxPerRow)%(nMaxPerRow+1);
                        if (d["f"]==="Chemistry") {
                            return scaleX_2_chem(i_col);
                        } else if (d["f"]==="Physics") {
                            return scaleX_2_phy(i_col);
                        } else if (d["f"]==="Medicine") {
                            return scaleX_2_med(i_col);
                        }
                    })
                    .attr("cy", function(d){
                        var sn = d["f_sn"];
                        var i_row = Math.ceil(sn/nMaxPerRow);
                        return scaleY_2(i_row);
                    })
                    .attr("r", ptR_vis2)
                    .attr("fill", function(d){
                        return getColByF(d["f"]);
                    })
                    .on("mouseover", function(d) {

                        //Get this point's x/y values, then augment for the tooltip
                        //var xPosition = parseFloat(d3.select(this).attr("cx"));
                        //var yPosition = parseFloat(d3.select(this).attr("cy"));
                        
                        // fixed position: top right conor
                        var xPosition=(w-pdR)*0.8;
                        var yPosition=pdT/3;

                        //Update the tooltip position and value
                        var infoBox = d3.select("#tooltip")
                                        .style("left", xPosition + "px")
                                        .style("top", yPosition + "px");  
                        
                        infoBox.select("#value_1").text(d["n"]);
                        infoBox.select("#value_2").text("Awarded: " + d["yp"]);
                        var val3 = parseTheo(d["t"]);
                        infoBox.select("#value_3").text(val3);

                        //Show the tooltip
                        d3.select("#tooltip").classed("hidden", false);

                    } )
                    .on("mouseout", function() {
                      //Hide the tooltip
                      d3.select("#tooltip").classed("hidden", true);
                    });

                // labels
                vis2.append("text").text("Chemistry ("+d3.max(dataset, function(d){ return d["f_sn"]*(d["f"]==="Chemistry"); })+")")
                    .attr("class", "lab").attr("fill", getColByF("Chemistry"))
                    .attr("x", pdL+wF/2).attr("y", pdT+hLab/2);
                vis2.append("text").text("Physics ("+d3.max(dataset, function(d){ return d["f_sn"]*(d["f"]==="Physics"); })+")")
                    .attr("class", "lab").attr("fill", getColByF("Physics"))
                    .attr("x", pdL+wF+pdF+wF/2).attr("y", pdT+hLab/2);
                vis2.append("text").text("Medicine ("+d3.max(dataset, function(d){ return d["f_sn"]*(d["f"]==="Medicine"); })+")")
                    .attr("class", "lab").attr("fill", getColByF("Medicine"))
                    .attr("x", pdL+wF+pdF+wF+pdF+wF/2).attr("y", pdT+hLab/2);

            } else if (pageNum % 5 === 2) {
                //console.log("2");

                // remove vis2
                vis2.selectAll("*")
                    .remove();

                txt_title = "Vis #3: Nature of prize-winning work";
                svg.select(".title").text(txt_title);
                svg.select(".nav").text("Click here for vis #4").attr("y", pdT*4/5);

                vis3.selectAll("circle")
                    .data(dataset)
                    .enter()
                    .append("circle")
                    .attr("cx", function(d){
                        var sn = d["t_sn"]; // not f_sn
                        var i_row = Math.ceil(sn/nMaxPerRow_t);
                        var i_col = (sn-(i_row-1)*nMaxPerRow_t)%(nMaxPerRow_t+1);
                        return scaleX_3(i_col);
                    })
                    .attr("cy", function(d){
                        var sn = d["t_sn"]; // not f_sn
                        var i_row = Math.ceil(sn/nMaxPerRow_t);
                        if (d["t"]===1) {
                            return scaleY_3_t1(i_row);
                        } else {
                            return scaleY_3_t0(i_row);
                        }
                    })
                    .attr("r", ptR_vis3)
                    .attr("fill", function(d){
                        return getColByF(d["f"]);
                    })
                    .on("mouseover", function(d) {

                        //Get this point's x/y values, then augment for the tooltip
                        //var xPosition = parseFloat(d3.select(this).attr("cx"));
                        //var yPosition = parseFloat(d3.select(this).attr("cy"));
                        
                        // fixed position: top right conor
                        var xPosition=(w-pdR)*0.8;
                        var yPosition=pdT/3;

                        //Update the tooltip position and value
                        var infoBox = d3.select("#tooltip")
                                        .style("left", xPosition + "px")
                                        .style("top", yPosition + "px");  
                        
                        infoBox.select("#value_1").text(d["n"]);
                        infoBox.select("#value_2").text(d["f"] + " (" + d["yp"] + ")");
                        infoBox.select("#value_3").text("Work: " + (d["yr"]-d["yb"]) 
                                                        + "; prize: " + (d["yp"]-d["yb"]) + " yrs old" );

                        //Show the tooltip
                        d3.select("#tooltip").classed("hidden", false);

                    } )
                    .on("mouseout", function() {
                      //Hide the tooltip
                      d3.select("#tooltip").classed("hidden", true);
                    });

                    // labels
                    vis3.append("text").text("Empirical ("+d3.max(dataset, function(d){ return d["t_sn"]*(d["t"]===0); })+")")
                    .attr("class", "lab")
                    .attr("x", w/2).attr("y", pdT+hLab_t/2);

                    vis3.append("text").text("Theory (or Theory & Empirical) ("+d3.max(dataset, function(d){ return d["t_sn"]*(d["t"]===1); })+")")
                    .attr("class", "lab")
                    .attr("x", w/2).attr("y", pdT+hLab_t+h_t+pd_t+hLab_t/2);

            } else if (pageNum % 5 === 3) {
                //console.log("3");

                // remove vis3
                vis3.selectAll("*")
                    .remove();

                txt_title = "Vis #4: Are female laureates outliers in terms of timing of award?";
                svg.select(".title").text(txt_title);
                svg.select(".nav").text("Click here for vis #5").attr("y", pdT*4/5);

                vis4.selectAll("circle")
                    .data(dataset)
                    .enter()
                    .append("circle")
                    .attr("cx", function(d){return scaleX_4(d["ypMinusR"]);})
                    .attr("cy", function(d){return scaleY_4(d["ypMinusR_count"]);})
                    .attr("r", ptR_vis1)
                    .attr("fill", function(d){
                        // if female, use a different color
                        if (n_fm.includes(d[["n"]])) {
                            return "red";
                        } else {
                            return "gray";
                        }
                    })
                    .on("mouseover", function(d) {

                        //Get this point's x/y values, then augment for the tooltip
                        //var xPosition = parseFloat(d3.select(this).attr("cx"));
                        //var yPosition = parseFloat(d3.select(this).attr("cy"));
                        
                        // fixed position: top right conor
                        var xPosition=(w-pdR)*0.8;
                        var yPosition=pdT/3;

                        //Update the tooltip position and value
                        var infoBox = d3.select("#tooltip")
                                        .style("left", xPosition + "px")
                                        .style("top", yPosition + "px");  
                        
                        infoBox.select("#value_1").text(d["n"]);
                        infoBox.select("#value_2").text(d["f"] + " (" + d["yp"] + ")");
                        infoBox.select("#value_3").text("Work: " + (d["yr"]-d["yb"]) 
                                                        + "; prize: " + (d["yp"]-d["yb"]) + " yrs old" );

                        //Show the tooltip
                        d3.select("#tooltip").classed("hidden", false);

                    } )
                    .on("mouseout", function() {
                      //Hide the tooltip
                      d3.select("#tooltip").classed("hidden", true);
                    });

                // axes
                vis4.append("g")
                    .attr("class", "axis")
                    .attr("transform", "translate(0," + (h-pdB) + ")")
                    .call(axisX_4);

                vis4.append("g")
                    .attr("class", "axis")
                    .attr("transform", "translate(" + (pdL-10) + "," + 0 + ")")
                    .call(axisY_4);

                // axis labels
                vis4.append("text").text("# years between winning prize and doing prize-winning work")
                    .attr("class", "lab").attr("x", w/2).attr("y", h-pdB*0.1);
                vis4.append("text").text("# laureates")
                    .attr("class", "lab").attr("x", pdL/4).attr("y", h*0.5)
                    .attr("transform", "rotate(270,"+(pdL/4)+","+(h*0.5)+")");;

                // legend
                vis4.append("text").text("Legend").attr("class", "lab").attr("x", w-pdR).attr("y", pdT);
                vis4.append("text").text("Male").attr("class", "lab").attr("x", w-pdR+10).attr("y", pdT+25);
                vis4.append("text").text("Female").attr("class", "lab").attr("x", w-pdR+20).attr("y", pdT+50);
                vis4.append("circle").attr("cx", (w-pdR)-25).attr("cy", pdT+20*1).attr("r", ptR_vis1*2)
                    .attr("fill", "gray");
                vis4.append("circle").attr("cx", (w-pdR)-25).attr("cy", pdT+15*3).attr("r", ptR_vis1*2)
                    .attr("fill", "red");

            } else if (pageNum % 5 === 4) {
                //console.log("1");

                // remove vis4
                vis4.selectAll("*")
                    .remove();

                txt_title = "Vis #5: Long live Nobel laureates?";
                svg.select(".title").text(txt_title);
                svg.select(".nav").text("Click here for vis #1").attr("y", pdT*4/5);

                vis5.selectAll("circle")
                    .data(dataset)
                    .enter()
                    .append("circle")
                    .attr("cx", function(d, i){return scaleX_5(i);})
                    .attr("cy", function(d){
                        if ( (!isNaN(d["yd"])) && (!isNaN(d["yb"])) ) {
                            return scaleY_5(d["yd"]-d["yb"]);
                        } else {
                            return 0;
                        }
                    })
                    .attr("r", ptR_vis1)
                    .attr("fill", "white")
                    .attr("stroke", function(d){
                        if ( (!isNaN(d["yd"])) && (!isNaN(d["yb"])) ) {
                            return "black";
                        } else {
                            return "transparent";
                        }
                    })
                    .on("mouseover", function(d) {

                        //Get this point's x/y values, then augment for the tooltip
                        //var xPosition = parseFloat(d3.select(this).attr("cx"));
                        //var yPosition = parseFloat(d3.select(this).attr("cy"));
                        
                        // fixed position: top right conor
                        var xPosition=(w-pdR)*0.8;
                        var yPosition=pdT/3;

                        //Update the tooltip position and value
                        var infoBox = d3.select("#tooltip")
                                        .style("left", xPosition + "px")
                                        .style("top", yPosition + "px");  
                        
                        infoBox.select("#value_1").text(d["n"]);
                        infoBox.select("#value_2").text(d["f"] + " (" + d["yp"] + ")");
                        infoBox.select("#value_3").text("Birth: " + d["yb"] 
                                                        + "; death: " + d["yd"] );

                        //Show the tooltip
                        d3.select("#tooltip").classed("hidden", false);

                    } )
                    .on("mouseout", function() {
                      //Hide the tooltip
                      d3.select("#tooltip").classed("hidden", true);
                    });

                // axes
                vis5.append("g")
                    .attr("class", "axis")
                    .attr("transform", "translate(0," + (h-pdB) + ")")
                    .call(axisX_5);

                vis5.append("g")
                    .attr("class", "axis")
                    .attr("transform", "translate(" + (pdL-10) + "," + 0 + ")")
                    .call(axisY_5);

                // axis labels
                vis5.append("text").text("Index")
                    .attr("class", "lab").attr("x", w/2).attr("y", h-pdB*0.1);
                vis5.append("text").text("Age of death")
                    .attr("class", "lab").attr("x", pdL/4).attr("y", h*0.5)
                    .attr("transform", "rotate(270,"+(pdL/4)+","+(h*0.5)+")");;

            }

        });

    }

});