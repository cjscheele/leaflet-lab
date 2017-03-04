//function to instantiate the Leaflet map
function createMap(){
    //create the map
    var map = L.map('map', {
        center: [20, 0],
        zoom: 2
    });
        
    //Create a tile layer
    L.tileLayer('https://api.mapbox.com/styles/v1/cjscheele/ciz33yu8t00332sprm6kyrjxo/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiY2pzY2hlZWxlIiwiYSI6ImNpajh4djdscDAwMjB1bWx4Z3c4eGxwZGcifQ.SsInFC_hOJv95SYpnT7w4Q'
    ).addTo(map);
    
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
    console.log(fuse);
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
        e.layer.setStyle({fillColor: '#3f0', color: '#0f0'});
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
        fillColor: "#ff7800",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    //for each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, options);

    //build popup content string
    var year = attribute.split("total")[1];
    var popupContent = "<p>"+feature.properties[attribute]+" TEUs</p>";

    //bind the popup to the circle marker
    layer.bindPopup(popupContent, {
        offset: new L.Point(0,-options.radius) 
    });

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

function updatePanel(feature){
    var content = "<h1>Port of "+feature.properties.port+"</h1>";
    content += "<div id='panelPic'><img src='"+feature.properties.img+"'></div>";
    content += "<div id='panelDesc'><p>"+feature.properties.desc+"</p></div>";
    content += "<div id='panelLink'>Source: <a href='"+feature.properties.wiki+"' target='_blank'>Wikipedia</a></div>";
    $("#panel").empty().append(content);
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

//Create new sequence controls
function createSequenceControls(map,attributes){
    //create range input element (slider)
    $('#panel').append('<input class="range-slider" type="range">');

     //set slider attributes
    $('.range-slider').attr({
        max: 10,
        min: 0,
        value: 0,
        step: 1
    });

    $('#panel').append('<button class="skip" id="reverse">Reverse</button>');
    $('#panel').append('<button class="skip" id="forward">Skip</button>');

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
};

//Resize proportional symbols according to new attribute values
function updatePropSymbols(map, attribute){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            //access feature properties
            var props = layer.feature.properties;

            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);

            //add city to popup content string
            var year = attribute.split("total");
            var popupContent = "<p>"+layer.feature.properties[attribute]+" TEUs</p>";

            //replace the layer popup
            layer.setPopupContent(popupContent, {
                offset: new L.Point(0,-radius)
            });
        };
    });
};

$(document).ready(createMap);