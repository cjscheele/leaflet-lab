//function to instantiate the Leaflet map
function createMap(){
    //create the map
    var map = L.map('map', {
        center: [20, 10],
        zoom: 2,
        minZoom: 2,
        maxZoom: 10,
        maxBounds: [
        //south west
        [-47, -140],
        //north east
        [66, 154]
        ],
    });
        
    //Create a tile layer
    L.tileLayer('https://api.mapbox.com/styles/v1/cjscheele/ciz33yu8t00332sprm6kyrjxo/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiY2pzY2hlZWxlIiwiYSI6ImNpajh4djdscDAwMjB1bWx4Z3c4eGxwZGcifQ.SsInFC_hOJv95SYpnT7w4Q'
    ).addTo(map);

    //Create info button
    infoPanel();
    L.easyButton({
    	id: 'info-button',
    	position: 'topright',
    	states:[{
    		stateName: 'get-info',
    		onClick: function(button, map){
      			infoPanel();
    	},
    	title: 'About the map',
    	icon: '<span class="glyphicon glyphicon-info-sign"></span>'
    }]
    }).addTo(map);
    
    //call getData function
    getData(map);
};

//Import GeoJSON data
function getData(map){
    //load the data
    $.ajax("data/ports.geojson", {
        dataType: "json",
        success: function(response){
            //create an attributes array
            var attributes = ["total2005","total2006","total2007","total2008","total2009","total2010","total2011","total2012","total2013","total2014"]

            createPropSymbols(response, map, attributes);
            createSequenceControls(map, attributes);
            createLegend(map,attributes);
        }
    });
};

//Add circle markers for point features to the map
function createPropSymbols(data, map, attributes){
    //create a Leaflet GeoJSON layer and add it to the map
    var markerLayer = L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(map);

    //Initialize Search Control
    var fuse = new Fuse(data.features, {
            keys: ['properties.port','properties.country'],
            threshold:.2,
            tokenize: true,
            matchAllTokens: true
    });
    var searchControl = new L.Control.Search({
        marker: L.circleMarker([0,0],{radius:0,opacity:0}),
        layer: markerLayer,
        propertyName: 'port',
        zoom: 8,
        filterData: function(text, records) {
            var jsons = fuse.search(text),
                ret = {}, key;
            
            for(var i in jsons) {
                key = jsons[i].properties.port;
                ret[ key ]= records[key];
            }
            console.log(jsons,ret);
            return ret;
        }
    });

    searchControl.on('search:locationfound', function(e) {
        markerLayer.eachLayer(function(layer) {   //restore feature color
            markerLayer.resetStyle(layer);
        });
        e.layer.setStyle({
        	fillColor: '#142827',
        	color: '#1a3635',
        	weight: 1,
        	opacity: 1,
        	fillOpacity: 0.7
        });
        if(e.layer._popup)
            e.layer.openPopup();
    }).on('search:collapsed', function(e) {
        markerLayer.eachLayer(function(layer) {   //restore feature color
            markerLayer.resetStyle(layer);
        }); 
    });
    map.addControl( searchControl );  //inizialize search control
};

//Convert markers to circle markers
function pointToLayer(feature, latlng, attributes){
    //assign the current attribute based on the first index of the attributes array
    var attribute = attributes[0];

    //create marker options
    var options = {
        fillColor: "#438785",
        color: "#1a3635",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.7
    };

    //for each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, options);

    //create popup
    createPopup(feature.properties, attribute, layer, options.radius);

    //Add tooltip
    layer.bindTooltip("Port of "+feature.properties.port)

    //event listeners to open popup on hover
    layer.on({
        click: function(){
            this.openPopup();
            updatePanel(feature);
        },
        mouseover: function(){
            this.closePopup();
        }
    });

    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};

function createPopup(properties, attribute, layer, radius){
    //build popup content string
    var year = attribute.split("total")[1];
    var popupContent = "<p>"+properties[attribute]+" TEUs</p>";

    //bind the popup to the circle marker
    layer.bindPopup(popupContent, {
        offset: new L.Point(0,-radius) 
    });
}

function infoPanel(){
	var content = "<div id='panelTitle'>About the map</div>";
	content +="<p>Globalization over the past few decades has impacted trade, especially the businesses which facilitate it. Container shipping is an important facete of the global trade network. The <a href='http://www.economist.com/news/finance-and-economics/21578041-containers-have-been-more-important-globalisation-freer-trade-humble' target='_blank'>Economist</a> recently declared that, &quot;new research suggests that the container has been more of a driver of globalisation than all trade agreements in the past 50 years together.&quot; To understand how container shipping has impacted trade, this map depicts the world's busiest container ports and compare their changes from 2005 to 2014 using data collected by the <a href='http://www.worldshipping.org/' target='_blank'>World Shipping Council</a>. The twenty-foot equivalent unit (TEU) is the standard unit to measure the amount of cargo being shipped from a port. One TEU represents the approximate volume of a single container. Map design by Chris Scheele.</p>";
    $("#panel").html(content);
}

function updatePanel(feature){
    var content = "<div id='panelTitle'>Port of "+feature.properties.port+"</div>";
    content += "<div id='panelPic'><img src='"+feature.properties.img+"' align='middle'></div>";
    content += "<div id='panelDesc'><p>"+feature.properties.desc+"</p></div>";
    content += "<div id='panelLink'>Source: <a href='"+feature.properties.wiki+"' target='_blank'>Wikipedia</a></div>";
    $("#panel").html(content);
};

function createGraph(feature){
    var avg = [5475.444444,6107.422222,6929.044444,7337.066667,6680.844444,7660.244444,8291.733333,8651.177778,8926.044444,9231.977778];
}

//Calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //scale factor to adjust symbol size evenly
    var scaleFactor = .1;
    //area based on attribute value and scale factor
    var area = attValue * scaleFactor;
    //radius calculated based on area
    var radius = Math.sqrt(area/Math.PI);

    return radius;
};

//Create dynamic legend
function createLegend(map, attributes){
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function (map) {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');

            //add temporal legend div to container
            $(container).append('<div id="temporal-legend">')

            //start attribute legend svg string
            var svg = '<svg id="attribute-legend" width="150px" height="80px">';

            //array of circle names to base loop on
            var circles = {
                max: 30,
                mean: 50,
                min: 70
            };

            //loop to add each circle and text to svg string
            for (var circle in circles){
                //circle string
                svg += '<circle class="legend-circle" id="' + circle + '" fill="#438785" fill-opacity="0.7" stroke="#1a3635" cx="40"/>';

                //text string
                svg += '<text id="' + circle + '-text" x="85" y="' + circles[circle] + '"></text>';
            };
            svg += "</svg>";

            //add attribute legend svg to container
            $(container).append(svg);

            return container;
        }
    });

    map.addControl(new LegendControl());
    updateLegend(map, attributes[0]);
};

function updateLegend(map, attribute){
    //create content for legend
    var year = attribute.split("total")[1];
    var content = "<h4>Exports in "+ year + "</h4><h6>(in thousand TEUs)</h6>";

    //replace legend content
    $('#temporal-legend').html(content);

    //get the max, mean, and min values as an object
    var circleValues = getCircleValues(map, attribute);

    for (var key in circleValues){
        //get the radius
        var radius = calcPropRadius(circleValues[key]);

        //assign the cy and r attributes
        $('#'+key).attr({
            cy: 75 - radius,
            r: radius
        });

        //add legend text
        $('#'+key+'-text').text(Math.round(circleValues[key]));
    };
};

//Calculate the max, mean, and min values for a given attribute
function getCircleValues(map, attribute){
    //start with min at highest possible and max at lowest possible number
    var min = Infinity,
        max = -Infinity;

    map.eachLayer(function(layer){
        //get the attribute value
        if (layer.feature){
            var attributeValue = Number(layer.feature.properties[attribute]);

            //test for min
            if (attributeValue < min){
                min = attributeValue;
            };

            //test for max
            if (attributeValue > max){
                max = attributeValue;
            };
        };
    });

    //set mean
    var mean = (max + min) / 2;

    //return values as an object
    return {
        max: max,
        mean: mean,
        min: min
    };
};

//Create new sequence controls
function createSequenceControls(map, attributes){   
    var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        onAdd: function (map) {
            // create the control container div with a particular class name
            var container = L.DomUtil.create('div', 'sequence-control-container');

            //create range input and skip buttons
            $(container).append('<button class="skip glyphicon glyphicon-step-backward" id="reverse"></button>');
            $(container).append('<input id="rangeSlider" class="range-slider" type="range">');
            $(container).append('<button class="skip glyphicon glyphicon-step-forward" id="forward"></button>');

            //kill any mouse event listeners on the map
            $(container).on('mousedown dblclick', function(e){
                L.DomEvent.stopPropagation(e);
            });

            // Disable dragging when user's cursor enters the element
            $(container).on('mouseover', function () {
                map.dragging.disable();
            });

            // Re-enable dragging when user's cursor leaves the element
            $(container).on('mouseout', function () {
                map.dragging.enable();
            });

            return container;
        }
    });

    map.addControl(new SequenceControl());

    //set slider attributes
    $('.range-slider').attr({
        max: 10,
        min: 0,
        value: 0,
        step: 1
    });
    
    //click listener for buttons
    $('.skip').click(function(){
        //get the old index value
        var index = $('.range-slider').val();

        //increment or decrement depending on button clicked
        if ($(this).attr('id') == 'forward'){
            index++;
            //if past the last attribute, wrap around to first attribute
            index = index > 10 ? 0 : index;
        } else if ($(this).attr('id') == 'reverse'){
            index--;
            //if past the first attribute, wrap around to last attribute
            index = index < 0 ? 10 : index;
        };

        //update slider
        $('.range-slider').val(index);
        updatePropSymbols(map, attributes[index]);
    });

    //input listener for slider
    $('.range-slider').on('input', function(){
        //get the new index value
        var index = $(this).val();
        updatePropSymbols(map, attributes[index]);
    });
}

//Resize proportional symbols according to new attribute values
function updatePropSymbols(map, attribute){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            //access feature properties
            var props = layer.feature.properties;

            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);

            //update popup
            createPopup(props, attribute, layer, radius);

            //update legend
            updateLegend(map, attribute);
        };
    });
};

$(document).ready(createMap);