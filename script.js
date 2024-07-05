const nodes = [
  { id: 0, group: 1 },
  { id: 1, group: 1 },
  { id: 2, group: 1 },
  { id: 3, group: 1 },
  { id: 4, group: 1 }
];

const links = [
  { source: 0, target: 2 },
  { source: 0, target: 1 },
  { source: 1, target: 3 },
  { source: 1, target: 4 },
  { source: 2, target: 3 }
];

const svg = d3.select("#mynetwork")
  .append("svg")
  .attr("width", "100%")
  .attr("height", "100%");

const width = +svg.style("width").replace("px", "");
const height = +svg.style("height").replace("px", "");

const color = d3.scaleOrdinal(d3.schemeCategory10);

const simulation = d3.forceSimulation(nodes)
  .force("link", d3.forceLink(links).id(d => d.id).distance(150))
  .force("charge", d3.forceManyBody().strength(-300))
  .force("center", d3.forceCenter(width / 2, height / 2));

let link = svg.append("g")
  .attr("class", "links")
  .selectAll("line");

let node = svg.append("g")
  .attr("class", "nodes")
  .selectAll("circle");

let selectedNodes = [];

function restart() {
  link = link.data(links);
  link.exit().remove();
  link = link.enter().append("line")
      .attr("stroke-width", 2)
      .attr("stroke", "#999")
      .merge(link);

  node = node.data(nodes, d => d.id);
  node.exit().remove();
  node = node.enter().append("circle")
      .attr("r", 10)
      .attr("fill", d => color(d.group))
      .on("click", (event, d) => selectNode(d))
      .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended))
      .merge(node);

  node.append("title")
      .text(d => d.id);

  simulation.nodes(nodes).on("tick", ticked);
  simulation.force("link").links(links);
  simulation.alpha(1).restart();
}

function ticked() {
  link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

  node
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);
}

function dragstarted(event, d) {
  if (!event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(event, d) {
  d.fx = event.x;
  d.fy = event.y;
}

function dragended(event, d) {
  if (!event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}

document.getElementById("addNodeBtn").addEventListener("click", () => {
  const newNode = { id: nodes.length ? Math.max(...nodes.map(n => n.id)) + 1 : 0, group: 1, x: width / 2, y: height / 2 };
  nodes.push(newNode);
  restart();
});

document.getElementById("addLinkBtn").addEventListener("click", () => {
  if (selectedNodes.length === 2) {
      const [source, target] = selectedNodes;
      links.push({ source: source.id, target: target.id });
      selectedNodes = [];
      restart();
  } else {
      alert("Please select two nodes to create a link.");
  }
});

document.getElementById("removeNodeBtn").addEventListener("click", () => {
  if (selectedNodes.length === 1) {
      const nodeToRemove = selectedNodes[0];
      nodes.splice(nodes.indexOf(nodeToRemove), 1);
      const linksToRemove = links.filter(l => l.source.id === nodeToRemove.id || l.target.id === nodeToRemove.id);
      linksToRemove.forEach(l => links.splice(links.indexOf(l), 1));
      selectedNodes = [];
      restart();
  } else {
      alert("Please select a node to remove.");
  }
});

document.getElementById("removeLinkBtn").addEventListener("click", () => {
  if (selectedNodes.length === 2) {
      const [source, target] = selectedNodes;
      const linkToRemove = links.find(l => (l.source.id === source.id && l.target.id === target.id) || (l.source.id === target.id && l.target.id === source.id));
      if (linkToRemove) {
          links.splice(links.indexOf(linkToRemove), 1);
          selectedNodes = [];
          restart();
      } else {
          alert("No link exists between the selected nodes.");
      }
  } else {
      alert("Please select two nodes to remove the link between them.");
  }
});

document.getElementById("articulationBtn").addEventListener("click", findArticulationPoints);

function selectNode(d) {
  if (selectedNodes.length < 2) {
      selectedNodes.push(d);
  } else {
      selectedNodes = [d];
  }
  node.attr("stroke", d => selectedNodes.includes(d) ? "black" : null)
      .attr("stroke-width", d => selectedNodes.includes(d) ? 3 : null);
}

function findArticulationPoints() {
  const graph = new Graph(nodes.length);
  links.filter(link => nodes.some(node => node.id === link.source.id) && nodes.some(node => node.id === link.target.id)).forEach(link => {
      graph.addEdge(link.source.id, link.target.id);
  });
  const articulationPoints = graph.findArticulationPoints();
  node.attr("fill", d => articulationPoints.includes(d.id) ? "#eb4034" : color(d.group));
  if (articulationPoints.length === 0) {
      displayMessage("No articulation points found.");
  } else {
      removeMessage();
  }
}

function displayMessage(message) {
  let messageDiv = document.getElementById("message");
  if (!messageDiv) {
      messageDiv = document.createElement("div");
      messageDiv.id = "message";
      messageDiv.style.position = "absolute";
      messageDiv.style.top = "20px";
      messageDiv.style.left = "50%";
      messageDiv.style.transform = "translateX(-50%)";
      messageDiv.style.padding = "10px";
      messageDiv.style.backgroundColor = "#f8d7da";
      messageDiv.style.color = "#721c24";
      messageDiv.style.border = "1px solid #f5c6cb";
      messageDiv.style.borderRadius = "5px";
      document.body.appendChild(messageDiv);
  }
  messageDiv.textContent = message;
}

function removeMessage() {
  const messageDiv = document.getElementById("message");
  if (messageDiv) {
      document.body.removeChild(messageDiv);
  }
}

class Graph {
  constructor(vertices) {
      this.vertices = vertices;
      this.adjList = new Map();
      for (let i = 0; i < vertices; i++) {
          this.adjList.set(i, []);
      }
  }

  addEdge(v, w) {
      if (this.adjList.has(v) && this.adjList.has(w)) {
          this.adjList.get(v).push(w);
          this.adjList.get(w).push(v);
      }
  }

  findArticulationPoints() {
      const visited = Array(this.vertices).fill(false);
      const disc = Array(this.vertices).fill(Infinity);
      const low = Array(this.vertices).fill(Infinity);
      const parent = Array(this.vertices).fill(null);
      const ap = Array(this.vertices).fill(false);

      const dfs = (u, time) => {
          visited[u] = true;
          disc[u] = low[u] = ++time;
          let children = 0;

          this.adjList.get(u).forEach(v => {
              if (!visited[v]) {
                  children++;
                  parent[v] = u;
                  dfs(v, time);
                  low[u] = Math.min(low[u], low[v]);

                  if ((parent[u] === null && children > 1) || (parent[u] !== null && low[v] >= disc[u])) {
                      ap[u] = true;
                  }
              } else if (v !== parent[u]) {
                  low[u] = Math.min(low[u], disc[v]);
              }
          });
      };

      for (let i = 0; i < this.vertices; i++) {
          if (!visited[i]) {
              dfs(i, 0);
          }
      }

      return ap.map((isAp, index) => isAp ? index : -1).filter(index => index !== -1);
  }
}

restart(); // Initial call to render the graph
