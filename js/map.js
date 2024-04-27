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

  var numberOfMarkers = 55;

  // Generate random lat lng points on map within 1km radius
  var latlngs = [];
  var center = [lat, lng];
  var radius = 0.01; // in km
  const maxDistance = 0.08; // in km

  for (var i = 0; i < numberOfMarkers; i++) {
    var angle, randomRadius, x, y, distance;
    do {
      angle = Math.random() * Math.PI * 2;
      randomRadius = Math.random() * radius;
      x = center[0] + randomRadius * Math.cos(angle);
      y = center[1] + randomRadius * Math.sin(angle);
      distance = Math.hypot(x - center[0], y - center[1]);
    } while (distance > maxDistance);
    latlngs.push([x, y, false]);
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
  let mst = kruskal(edges);

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
  if (leaves.length < 5) {
    // reload the page
    location.reload();
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

  // select a random contaminant index from the mst which must be at least 3 steps away based on the bfs

  // Perform BFS from the starting point
  const startDistances = bfs(mst, startPoint);

  // Filter out nodes that are less than 3 steps away
  const nodesAtLeast3StepsAway = Array.from(startDistances.entries())
    .filter(([node, distance]) => distance >= 3)
    .map(([node, distance]) => node);

  // Select a random node from the remaining nodes
  const randomIndex = Math.floor(Math.random() * nodesAtLeast3StepsAway.length);
  const contaminantIndex = randomIndex;

  console.log(contaminantIndex);

  // For each item in mst find the distance to the nearest leaf and the distance to the endPoint
  mst = mst.map((edge, i) => {
    const sourceDistances = bfs(mst, edge.source);
    const targetDistances = bfs(mst, edge.target);

    const leafWithMinDistance = leaves
      .map((leaf) => ({ leaf, distance: sourceDistances.get(leaf) }))
      .sort((a, b) => a.distance - b.distance)[0].leaf;
    console.log(leafWithMinDistance);
    const sourceToLeaf = sourceDistances.get(leafWithMinDistance);
    const sourceToEnd = sourceDistances.get(endPoint.toString());

    const targetToLeaf = Math.min(
      ...leaves.map((leaf) => targetDistances.get(leaf))
    );
    const targetToEnd = targetDistances.get(endPoint.toString());

    console.log(i);
    console.log("Source To nearest leaf: ", sourceToLeaf);
    console.log("Source To end point: ", sourceToEnd);
    console.log("Target To nearest leaf: ", targetToLeaf);
    console.log("Target To end point: ", targetToEnd);

    // If the source is closer to the leaf and the target is closer to the end point, keep the edge as it is
    // Otherwise, swap the source and target
    if (sourceToLeaf <= targetToLeaf && sourceToEnd >= targetToEnd) {
      return edge;
    } else {
      console.log("swapping target and source around");
      return { source: edge.target, target: edge.source };
    }
  });

  // Create a marker for each point
  for (var i = 0; i < latlngs.length; i++) {
    let markerIcon = L.divIcon({
      className: "my-div-icon",
      html: `<div style="background-color: white; border: 1px solid black; border-radius: 50%; width: 20px; height: 20px; text-align: center; line-height: 20px;">${i}</div>`,
    });

    if (i == startIndexInLatLngs) {
      markerIcon = L.divIcon({
        className: "my-div-icon",
        html: `<div style="background-color: green; border: 1px solid black; border-radius: 50%; width: 20px; height: 20px; text-align: center; line-height: 20px;">${i}</div>`,
      });
    } else if (i == endIndexInLatLngs) {
      markerIcon = L.divIcon({
        className: "my-div-icon",
        html: `<div style="background-color: red; border: 1px solid black; border-radius: 50%; width: 20px; height: 20px; text-align: center; line-height: 20px;">${i}</div>`,
      });
    } else if (i == contaminantIndex) {
      markerIcon = L.divIcon({
        className: "my-div-icon",
        html: `<div style="background-color: yellow; border: 1px solid black; border-radius: 50%; width: 20px; height: 20px; text-align: center; line-height: 20px;">${i}</div>`,
      });
    }

    L.marker(latlngs[i], { icon: markerIcon }).addTo(map);
  }

  // Draw the MST on the map with arrows
  mst.forEach((edge) => {
    let coordinates =
      edge.target === endIndexInLatLngs
        ? [edge.target, edge.source]
        : [edge.source, edge.target];

    let polyline = L.polyline(coordinates, { color: "blue" }).addTo(map);

    // Add an arrow to the polyline
    L.polylineDecorator(polyline, {
      patterns: [
        {
          offset: "100%", // Place the arrow at the end of the polyline
          repeat: 0, // Do not repeat the arrow
          symbol: L.Symbol.arrowHead({
            pixelSize: 20, // Size of the arrow head
            polygon: false, // Do not use a polygon to represent the arrow head
            pathOptions: { color: "blue" }, // Color of the arrow head
          }),
        },
      ],
    }).addTo(map);
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

// Breadth-first search to find the distances from the start point to all other points
function bfs(mst, start) {
  // Create a map to store the graph
  let graph = new Map();
  for (let edge of mst) {
    if (!graph.has(edge.source.toString())) {
      graph.set(edge.source.toString(), []);
    }
    if (!graph.has(edge.target.toString())) {
      graph.set(edge.target.toString(), []);
    }
    graph.get(edge.source.toString()).push(edge.target);
    graph.get(edge.target.toString()).push(edge.source);
  }

  // Create a map to store the distances and a queue for the BFS
  let distances = new Map();
  let queue = [{ node: start, distance: 0 }];

  // Perform the BFS
  while (queue.length > 0) {
    let { node, distance } = queue.shift();
    if (!distances.has(node.toString())) {
      distances.set(node.toString(), distance);
      for (let neighbor of graph.get(node.toString())) {
        queue.push({ node: neighbor, distance: distance + 1 });
      }
    }
  }

  return distances;
}

// Call the renderMap function
renderMap();
