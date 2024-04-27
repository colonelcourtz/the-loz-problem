import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// Render a leaflet map
function renderMap() {
  // Set the lat and long
  const lat = 54.32681;
  const lng = -2.74757;

  // Create a map in the "map"
  var map = L.map("map").setView([lat, lng], 13);

  // Add an OpenStreetMap tile layer

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
  }).addTo(map);

  var numberOfMarkers = 25;

  // Generate random lat lng points on map within 1km radius
  var latlngs = [];
  var center = [lat, lng];
  var radius = 0.01; // in km
  const maxDistance = 0.008; // in km

  // Generate a random index
  var randomIndex = Math.floor(Math.random() * numberOfMarkers);

  for (var i = 0; i < numberOfMarkers; i++) {
    let isContaminant = i == randomIndex ? true : false;
    var angle, randomRadius, x, y, distance;
    do {
      angle = Math.random() * Math.PI * 2;
      randomRadius = Math.random() * radius;
      x = center[0] + randomRadius * Math.cos(angle);
      y = center[1] + randomRadius * Math.sin(angle);
      distance = Math.hypot(x - center[0], y - center[1]);
    } while (distance > maxDistance);
    latlngs.push([x, y, isContaminant]);
  }

  // Zoom the map to the markers
  map.fitBounds(latlngs);

  // Create the Delaunay triangulation
  const delaunay = d3.Delaunay.from(latlngs);
  const triangles = delaunay.trianglePolygons();

  // Convert the triangles into a graph of edges with weights (distances)
  const edges = [];
  const edgeSet = new Set();
  triangles.forEach((triangle) => {
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      const p1 = triangle[i];
      const p2 = triangle[j];
      const edge = [p1, p2].sort().toString();
      if (!edgeSet.has(edge)) {
        edgeSet.add(edge);
        edges.push({
          source: p1,
          target: p2,
          weight: Math.hypot(p2[0] - p1[0], p2[1] - p1[1]),
        });
      }
    }
  });

  // Use Kruskal's algorithm to find the MST
  const mst = kruskal(edges);

  // Create a map to count the occurrences of each point in the MST
  const occurrences = new Map();
  mst.forEach((edge) => {
    const source = edge.source.toString();
    const target = edge.target.toString();
    occurrences.set(source, (occurrences.get(source) || 0) + 1);
    occurrences.set(target, (occurrences.get(target) || 0) + 1);
  });

  // Get the points that appear exactly once in the MST
  const leaves = Array.from(occurrences.entries())
    .filter(([point, count]) => count === 1)
    .map(([point, count]) => point);

  // Check if there are at least two leaves
  if (leaves.length < 2) {
    throw new Error("The MST must have at least two leaves");
  }

  // Pick a random start and end point from the leaves
  const startIndex = Math.floor(Math.random() * leaves.length);
  let endIndex;
  do {
    endIndex = Math.floor(Math.random() * leaves.length);
  } while (startIndex === endIndex); // Ensure the end point is different from the start point

  // Get the start and end points
  const startPoint = leaves[startIndex].split(",").map(Number);
  const endPoint = leaves[endIndex].split(",").map(Number);

  // Find the indices of the start and end points in the latlngs array
  const startIndexInLatLngs = latlngs.findIndex(
    (point) => point[0] === startPoint[0] && point[1] === startPoint[1]
  );
  const endIndexInLatLngs = latlngs.findIndex(
    (point) => point[0] === endPoint[0] && point[1] === endPoint[1]
  );

  // Create a marker for each point
  for (var i = 0; i < latlngs.length; i++) {
    if (latlngs[i][2] == true) {
      L.marker(latlngs[i], {
        icon: L.icon({ iconUrl: "/contaminant.png", iconSize: [30, 30] }),
      }).addTo(map);
    } else if (i == startIndexInLatLngs) {
      L.marker(latlngs[i], {
        icon: L.icon({ iconUrl: "/start.png", iconSize: [30, 30] }),
      }).addTo(map);
    } else if (i == endIndexInLatLngs) {
      L.marker(latlngs[i], {
        icon: L.icon({ iconUrl: "/end.png", iconSize: [30, 30] }),
      }).addTo(map);
    } else {
      L.marker(latlngs[i]).addTo(map);
    }
  }

  // Draw the MST on the map
  mst.forEach((edge) => {
    L.polyline([edge.source, edge.target], { color: "blue" }).addTo(map);
  });
}


// Kruskal's algorithm to find the MST
function kruskal(edges) {
  edges.sort((a, b) => a.weight - b.weight);
  const clusters = new Map();
  const mst = [];
  for (const edge of edges) {
    const { source, target } = edge;
    const sourceCluster = clusters.get(source.toString());
    const targetCluster = clusters.get(target.toString());
    if (
      sourceCluster === undefined ||
      targetCluster === undefined ||
      Array.from(sourceCluster).toString() !==
        Array.from(targetCluster).toString()
    ) {
      mst.push(edge);
      if (sourceCluster === undefined) {
        if (targetCluster === undefined) {
          const newCluster = new Set([source.toString(), target.toString()]);
          clusters.set(source.toString(), newCluster);
          clusters.set(target.toString(), newCluster);
        } else {
          targetCluster.add(source.toString());
          clusters.set(source.toString(), targetCluster);
        }
      } else if (targetCluster === undefined) {
        sourceCluster.add(target.toString());
        clusters.set(target.toString(), sourceCluster);
      } else {
        for (const point of targetCluster) {
          sourceCluster.add(point);
          clusters.set(point, sourceCluster);
        }
      }
    }
  }
  return mst;
}


// Call the renderMap function
renderMap();
