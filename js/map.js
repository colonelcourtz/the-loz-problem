import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

// Render a leaflet map
function renderMap() {
  // Set the lat and long
  const centerLat = 54.431173;
  const centerLng = -2.952792;


  const mapType = 2;
  var numberOfMarkers = 20;
  var minLeaves = numberOfMarkers / 3;
  var contaminantStepsFromStart = 5;
  var radius = 10; // In km

  // Create a map in the "map"
  var map = L.map("map").setView([centerLat, centerLng], 13);

  // Add an OpenStreetMap tile layer
  if (mapType == 1) {
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}").addTo(map);
  } else {
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
  }

  let leaves = [];
  let mst = [];

  // Check for minimum number of leaves
  while (leaves.length < minLeaves) {
    // Generate random LatLngs within a radius
    var latlngs = generateRandomLatLngs(
      centerLat,
      centerLng,
      numberOfMarkers,
      radius
    );

    // Zoom the map to the markers
    map.fitBounds(latlngs);

    // Create the Delaunay triangulation from the latlngs
    const delaunay = d3.Delaunay.from(latlngs);
    const triangles = delaunay.trianglePolygons();

    // Convert the triangles into a graph of edges with weights (distances)
    const edges = convertDelaunayToGraph(triangles);

    // Use Kruskal's algorithm to find the MST
    mst = kruskal(edges);

    // Find all the leaves in the MST - used for start and end, and checking for minimum number of leaves
    leaves = findLeavesInMst(mst);
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

  // select a random contaminant index from the mst which must be at least contaminantStepsFromStart away based on the bfs

  // Perform BFS from the starting point
  const startDistances = bfs(mst, endPoint);

  // Filter out nodes that are less than contaminantStepsFromStart steps away
  const nodesAtLeastNStepsAway = Array.from(startDistances.entries())
    .filter(([node, distance]) => distance >= contaminantStepsFromStart)
    .map(([node, distance]) => node);

  // Filter out leaf nodes
  const nonLeafNodesAtLeastNStepsAway = nodesAtLeastNStepsAway.filter(
    (node) => !leaves.includes(node)
  );

  // Select a random node from the remaining nodes
  const randomIndex = Math.floor(
    Math.random() * nonLeafNodesAtLeastNStepsAway.length
  );
  const contaminant = nonLeafNodesAtLeastNStepsAway[randomIndex];

  // Find the index of the contaminant in the latlngs array
  const contaminantIndex = latlngs.findIndex(
    (point) =>
      point[0] === parseFloat(contaminant.split(",")[0]) &&
      point[1] === parseFloat(contaminant.split(",")[1])
  );

  // For each item in mst find the distance to the nearest leaf and the distance to the endPoint
  let newMst = mst.map((edge, i) => {
    const sourceDistances = bfs(mst, edge.source);
    const targetDistances = bfs(mst, edge.target);

    const leafWithMinDistance = leaves
      .map((leaf) => ({ leaf, distance: sourceDistances.get(leaf) }))
      .sort((a, b) => a.distance - b.distance)[0].leaf;
    console.log(leafWithMinDistance);

    const sourceToEnd = sourceDistances.get(endPoint.toString());

    const targetToLeaf = Math.min(
      ...leaves.map((leaf) => targetDistances.get(leaf))
    );
    const targetToEnd = targetDistances.get(endPoint.toString());

    console.log(i);

    console.log("Source To end point: ", sourceToEnd);
    console.log("Target To nearest leaf: ", targetToLeaf);
    console.log("Target To end point: ", targetToEnd);

    // If the source is closer to the leaf and the target is closer to the end point, keep the edge as it is
    // Otherwise, swap the source and target
    if (sourceToEnd >= targetToEnd) {
      return edge;
    } else {
      console.log("swapping target and source around");
      return { source: edge.target, target: edge.source };
    }
  });

  // Find the index of the adjacent point to the contaminant in the MST closest to the end point using the bfs
  const contaminantDistances = bfs(newMst, contaminant);

  //CTODO need to find the next adjacent point to the contaminant in the mst which is closest to the end point (currently just get a random adjacent point)
  // Then we need to do this iteratively through all the points down to the endpoint
  // Then we need to give a reading from the endpoint and allow 3 stages of selection of 3 samples, to then determine where the contamination is
  // Then add option to set 2 or more contamination points at differing values
  // Contamination should reduce at points where another branch joins the main branch between the contaminant and the end point relative to the number of branches above with a random modifier
  // This will be complicated, but a good puzzle : )
  const adjacentPointToContaminant = Array.from(contaminantDistances.entries())
    .filter(([node, distance]) => distance === 1)
    .map(([node, distance]) => node)[0];

  console.log(adjacentPointToContaminant);

  // find the index of the adjacent point to the contaminant in the latlngs array
  const adjacentPointToContaminantIndex = latlngs.findIndex(
    (point) =>
      point[0] === parseFloat(adjacentPointToContaminant.split(",")[0]) &&
      point[1] === parseFloat(adjacentPointToContaminant.split(",")[1])
  );

  console.log("Adjacent point to contaminant: ", adjacentPointToContaminant);

  // Create a marker for each point

  for (var i = 0; i < latlngs.length; i++) {

    let markerColour = '#00000030';
    if (i == startIndexInLatLngs) {
      markerColour = 'green';
    } else if (i == endIndexInLatLngs) {
      markerColour = 'red';
    } else if (i == contaminantIndex) {
      markerColour = 'yellow';
    } else if (i == adjacentPointToContaminantIndex) {
      markerColour = 'orange';
    }
    let markerIcon = L.divIcon({
      className: "my-div-icon",
      //html: `<div style="background-color: ${markerColour}; border: 1px solid black; border-radius: 50%; width: 20px; height: 20px; text-align: center; line-height: 20px;">${i} - ${latlngs[i]}</div>`,
      html: `<div style="background-color: ${markerColour}; border: 1px solid black; border-radius: 50%; width: 20px; height: 20px; text-align: center; line-height: 20px;">${i}</div>`,
    });
    L.marker(latlngs[i], { icon: markerIcon }).addTo(map);
  }

  let lineWidth = 2;

  // Draw the MST on the map with arrows
  newMst.forEach((edge, i) => {
    let coordinates =
      edge.target === endIndexInLatLngs
        ? [edge.target, edge.source]
        : [edge.source, edge.target];

    let polyline = L.polyline(coordinates, { color: "blue", weight: lineWidth }).addTo(
      map
    );
    const lastPoint = polyline.getLatLngs().slice(-1)[0];
    // Add an arrow to the polyline
    L.polylineDecorator(polyline, {
      patterns: [
        {
          offset: "100%", // Place the arrow at the end of the polyline
          repeat: 0, // Do not repeat the arrow
          symbol: L.Symbol.arrowHead({
            pixelSize: lineWidth*3, // Size of the arrow head
            polygon: false, // Do not use a polygon to represent the arrow head
            pathOptions: { color: "blue", weight: lineWidth }, // Color of the arrow head
          }),
        },
      ],
    }).addTo(map);
  });

  // draw a line from the start point to a point off the screen which does not cross any of the existing paths
  //let line = L.polyline([latlngs[startIndexInLatLngs], [100, 100]], { color: "green", weight: lineWidth }).addTo(map);

  // do the same for the end point to a point off the screen in the opposite direction
 // line = L.polyline([latlngs[endIndexInLatLngs], [-100, -100]], { color: "red", weight: lineWidth }).addTo(map);



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

// Use Breadth-first search to find the distances from the start point to all other points
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

// Generate random lat lng points on map within 1km radius
function generateRandomLatLngs(centerLat, centerLng, numberOfMarkers, radius) {

  var latlngs = [];
  var center = [centerLat, centerLng];

  for (var i = 0; i < numberOfMarkers; i++) {
    var angle, randomRadius, x, y, distance;
    angle = Math.random() * Math.PI * 2;
    randomRadius = Math.random() * radius / 1000;
    x = center[0] + randomRadius * Math.cos(angle);
    y = center[1] + randomRadius * Math.sin(angle);
    distance = Math.hypot(x - center[0], y - center[1]);
    latlngs.push([x, y, false]);
  }
  return latlngs;
}

// Convert the triangles into a graph of edges with weights (distances)
function convertDelaunayToGraph(triangles){
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
  return edges;
}


function findLeavesInMst(mst){
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

  return leaves;
}

// Call the renderMap function
renderMap();
