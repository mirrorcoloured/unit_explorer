// https://github.com/nicolaspanel/numjs
// https://homepages.rpi.edu/~mitchj/handouts/linalg/

import {loadCSVtoAoO, loadJSON} from "./load_file.js";

const el_graph = document.querySelector("#graph");
const el_menu = document.querySelector("#menu");
const el_hide_disconnected = document.querySelector("#hide-disconnected");
const el_invert_operator = document.querySelector("#invert-operator");
const el_power_min = document.querySelector("#power_min");
const el_power_max = document.querySelector("#power_max");

nj.equals = function(a, b) {
    return JSON.stringify(a.tolist()) == JSON.stringify(b.tolist());
}

loadCSVtoAoO("unitcompositions.csv", function(response) {
    let csv_data = response;

    let basis_dimensions = [];
    let selected_dimensions = [];

    let nodes = new vis.DataSet();
    let node_obj = {};
    let edges = new vis.DataSet();
    let edge_obj = {};

    function calculate_dimension(dimensionstring) {
        let dim = [];
        let [pre, post] = dimensionstring.split("/");
        if (!post) {
            post = "";
        }
        for (let measure of basis_dimensions) {
            dim.push((pre.match(new RegExp(measure, "g")) || []).length - (post.match(new RegExp(measure, "g")) || []).length);
        }
        return dim;
    }

    el_hide_disconnected.addEventListener("input", function() {
        if (el_hide_disconnected.checked) {
            hideAllNodes();
            createEdges();
        } else {
            showAllNodes();
        }
    })

    el_invert_operator.addEventListener("input", function() {
        if (el_hide_disconnected.checked) {
            hideAllNodes();
        }
        createEdges();
    })

    // populate menu and dimensions list
    for (let node of csv_data) {
        let row = document.createElement("tr");
        let cellbox = document.createElement("td");
        let box = document.createElement("input");
        let cellitem = document.createElement("td");
        box.type = "checkbox";
        box.value = node.Symbol;
        box.addEventListener("input", function (e) {
            if (box.checked) {
                selected_dimensions.push(node.Symbol);
            } else {
                selected_dimensions.splice(selected_dimensions.indexOf(node.Symbol), 1);
            }
            if (el_hide_disconnected.checked) {
                hideAllNodes();
            }
            createEdges();
        });
        cellitem.innerHTML = `${node.Unit} (${node.Symbol})`;
        cellbox.appendChild(box);
        row.appendChild(cellbox);
        row.appendChild(cellitem);
        el_menu.appendChild(row);

        if (node.Symbol == node.Composition) {
            basis_dimensions.push(node.Symbol);
            selected_dimensions.push(node.Symbol);
            box.checked = true;
        }
    }

    // create nodes
    for (let node of csv_data) {
        let obj = {
            id: node.Unit,
            label: node.Unit + ` (${node.Symbol})\n` + node.Composition,
            color: {
                background: selected_dimensions.indexOf(node.Composition) >= 0 ? "red" : "pink",
                border: "black",
                highlight: {
                    border: "white",
                    background: "lightgreen",
                },
            },
            Unit: node.Unit,
            Symbol: node.Symbol,
            hidden: el_hide_disconnected.checked ? true : false,
        };
        node.vector = nj.array(calculate_dimension(node.Composition));
        node.magnitude = nj.abs(node.vector).sum();
        node_obj[node.Symbol] = node;

        nodes.add(obj);
    }

    // TODO find way to stop hidden nodes from participating in physics, or just remove and re-add
    function hideNode(node) {
        nodes.update({id: node.Unit, hidden: true, physics: false, size: 0});
    }

    function showNode(node) {
        nodes.update({id: node.Unit, hidden: false, physics: true, size: 25});
    }

    function hideAllNodes() {
        nodes.forEach(node => hideNode(node));
    }

    function showAllNodes() {
        nodes.forEach(node => showNode(node));
    }

    // create edges
    function createEdges() {
        edges.clear();
        const power_min = Number(el_power_min.value);
        const power_max = Number(el_power_max.value);
        for (let nodea of csv_data) {
            for (let nodeb of csv_data) {
                if (nodea == nodeb) {
                    continue
                }

                // check dimension vectors
                for (let dimension_symbol of selected_dimensions) {
                    const dimension_vector = node_obj[dimension_symbol].vector;
                    for (let p=power_min; p<=power_max; p++) {
                        const p_vector = nj.array(Array(basis_dimensions.length).fill(p));
                        const scaled_vector = nj.multiply(p_vector, dimension_vector);
                        if (nj.equals(nj.add(nodea.vector, scaled_vector), nodeb.vector)) {
                            edges.add({
                                from: nodea.Unit,
                                to: nodeb.Unit,
                                arrows: "to",
                                label: p > 1 ? `* ${dimension_symbol}^${p}` : `* ${dimension_symbol}`,
                            });
                            showNode(nodea);
                            showNode(nodeb);
                            // nodes.update({id: nodea.Unit, hidden: false});
                            // nodes.update({id: nodeb.Unit, hidden: false});
                        }
                    }
                }

                // check for inversion
                if (el_invert_operator.checked) {
                    if (nj.equals(nj.negative(nodea.vector), nodeb.vector) && nodea.Id > nodeb.Id) {
                        edges.add({
                            from: nodea.Unit,
                            to: nodeb.Unit,
                            arrows: "to from",
                            label: "^-1",
                        });
                        showNode(nodea);
                        showNode(nodeb);
                        // nodes.update({id: nodea.Unit, hidden: false});
                        // nodes.update({id: nodeb.Unit, hidden: false});
                    }
                }
            }
        }
    }
    createEdges();

    console.log('post processed data', csv_data, nodes, edges);

    document.querySelector("#test").addEventListener("click", function() {

    })

    // edges.add({
    //     from: "Length",
    //     to: "Angle",
    //     arrows: "to",
    //     label: `/ l`,
    // });

    let data = {
        nodes: nodes,
        edges: edges,
    }

    let N = new vis.Network(el_graph, data, {
        physics:{
            barnesHut: {
                springLength: 95,
                springConstant: 0.04,
                damping: 0.09,
                avoidOverlap: 0.2,
        }}
    });
})
