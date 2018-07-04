var regionStyle = {
    fillColor: '#17b6e6',
    weight: 1,
    opacity: 1,
    color: '#292929',
    fillOpacity: 0.7
};

var activeRegionStyle = {
    fillColor: '#0000FF',
    weight: 2,
    opacity: 1,
    color: '#0000FF',
    fillOpacity: 0.7
};

var capitalIcon = L.icon({
    iconUrl: 'img/capital.png',
    iconSize:     [16, 16],
    shadowSize:   [0, 0],
    iconAnchor:   [8, 8],
    shadowAnchor: [0, 0], 
    popupAnchor:  [0, 0],
});

var selectedCapitalIcon = L.icon({
    iconUrl: 'img/capital_sel.png',
    iconSize:     [16, 16],
    shadowSize:   [0, 0],
    iconAnchor:   [8, 8],
    shadowAnchor: [0, 0], 
    popupAnchor:  [0, 0],
});

var topojson;
var posts = {};
var side_block = document.getElementById('side-content');
var side_wrapper = document.getElementById('side-wrapper');
var side_top_region = document.getElementById('side-top-panel-region');
var region_popup = L.popup();
var active_region = -1;
var active_feature;

function getWidth() {
	var w = (window.innerWidth > 0) ? window.innerWidth : screen.width;
	return (w < 480) ? w : 480;
}

function sendGetRequest(url, callback) {
	var request = new XMLHttpRequest();
	request.open('GET', url, true);

	request.onload = function() {
	  if (request.status >= 200 && request.status < 400) {
	    callback(request.responseText);
	  } else {
	    // TODO Notify
	  }
	};

	request.onerror = function() {
	  // TODO Notify
	};

	request.send();
}

function getJson(url, callback) {
	sendGetRequest(url, function(text) {
		var data = JSON.parse(text);
		callback(data);
	});
}

function getPostsByRegion(id) {
	if (posts[id] == undefined) {
		return [];
	} else {
		return posts[id];
	}
}

function vkRender(region) {
	if (!window.VK || !VK.Widgets || !VK.Widgets.Post) {
		setTimeout(function(){vkRender(region)}, 100);
		return;
	}

	var regposts = getPostsByRegion(region);
	while (side_block.firstChild) {
		side_block.removeChild(side_block.firstChild);
	}

	for (var i = 0; i < regposts.length; i++) {
		var el = document.createElement('div');
		el.id = 'post' + regposts[i]['id'];
		side_block.appendChild(el);

		(function() {if (!VK.Widgets.Post('post' + regposts[i]['id'], 
			-60106977, regposts[i]['id'], regposts[i]['h'], {width: getWidth()})) {
			setTimeout(arguments.callee, 50)
		}}());
	}
}

function openRegionPopup(target) {
	if (target.feature.properties.id == active_region) {
		return;
	}
	var p = getPostsByRegion(target.feature.properties.id);
	var n = target.feature.properties.name;
	region_popup.setContent("<b>" + n + "</b><br>" +
		"We have " + p.length + " alumn" + (p.length > 1 ? "i" : "us") + " there!<br>" + 
		"<small>Click the region to see alumni posts</small>");
	if (target.feature.geometry.type.toLowerCase() == "point") {
		region_popup.setLatLng(target.getLatLng());
	} else {
		region_popup.setLatLng(target.getCenter());
	}
	map.openPopup(region_popup);
}

function closeRegionPopup() {
	map.closePopup(region_popup);
}

function openSideBlock(region) {
	side_top_region.innerHTML = region;
	side_wrapper.style.width = getWidth() + "px";
}

function resetFeatureStyle(obj) {
	if (obj.feature.geometry.type.toLowerCase() == "point") {
		obj.setIcon(capitalIcon);
	} else {
		topojson.resetStyle(obj);
	}
}

function closeSideBlock() {
	active_region = -1;
	if (active_feature) {
		resetFeatureStyle(active_feature);
		active_feature = undefined;
	}
	document.getElementById('side-wrapper').style.width = 0;
}

function highlightFeature(e) {
	if (e.target.feature.properties.id == active_region) {
		return;
	}
	openRegionPopup(e.target);
}

function unhighlightFeature(e) {
	closeRegionPopup()
}

function clickFeature(e) {
	if (e.target.feature.properties.id == active_region) {
		return;
	}
	closeRegionPopup();
	if (e.target.feature.geometry.type.toLowerCase() == "point") {
		e.target.setIcon(selectedCapitalIcon);
		map.panTo(e.target.getLatLng());
	} else {
		e.target.setStyle(activeRegionStyle);
		map.panTo(e.target.getCenter());
	}
	active_region = e.target.feature.properties.id;
	if (active_feature) {
		resetFeatureStyle(active_feature);
		active_feature = undefined;
	}
	active_feature = e.target;
	vkRender(e.target.feature.properties.id);
	openSideBlock(e.target.feature.properties.name);
}

function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: unhighlightFeature,
        click: clickFeature
    });
}

function geoJSONpointToLayer(feature, latlng) {
	var marker = L.marker(latlng, {icon: capitalIcon}).addTo(map);
	var tt = L.tooltip({
		permanent: true,
		className: 'capital-tooltip',
		interactive: false,
		direction: 'right',
	});
	tt.setContent(feature.properties.name);
	marker.bindTooltip(tt).openTooltip();
	return marker;
}

document.getElementById('side-top-panel-close').addEventListener('click', function(event) {
	setTimeout(function(){event.target.blur();}, 100);
	closeSideBlock();
});

var map = new L.Map('mapid', 
	{
		center: new L.LatLng(36.244, -29.971), 
		zoom: 3, 
		maxZoom: 7,
		zoomAnimation: false, 
		worldCopyJump: true,
		closePopupOnClick: true
	});

var CartoDB_Positron = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
  subdomains: 'abcd',
  maxZoom: 19
});
map.addLayer(CartoDB_Positron);

sendGetRequest("//" + window.location.host + "/geojson/topoversion", function(version) {
	getJson("//" + window.location.host + "/static/topo.json?v=" + version, 
		function(data) {
			topojson = L.topoJson(data, {
				style: regionStyle,
				onEachFeature: onEachFeature,
				pointToLayer: geoJSONpointToLayer,
			});
			topojson.addTo(map);

			getJson("//"+ window.location.host + "/geojson/", function(data) {
				posts = data;
			});
		});
});
