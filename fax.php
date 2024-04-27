<html>

<head>
<title>Display leaflet map from JS</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />

<style>
    #map {
        position:absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
    }
    body, html {
        height: 100%;
        margin: 0;
        padding: 0;
    }
</style>

</head>
<body>
<div id="map">MAP HERE</div>

</body>

<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
<script src="
https://cdnjs.cloudflare.com/ajax/libs/leaflet-polylinedecorator/1.1.0/leaflet.polylineDecorator.min.js
"></script>

<script type="module" src="js/map.js"></script>
</html>

