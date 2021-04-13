// https://github.com/nicolaspanel/numjs
// https://homepages.rpi.edu/~mitchj/handouts/linalg/

import {loadCSVtoAoO, loadJSON} from "./load_file.js";

class UnitExplorer {
    constructor(datafile) {
        this.datafile = datafile;
        loadCSVtoAoO(this.datafile, this.init.bind(this));
    }

    init(csvdata) {
        // run once
        this.data = csvdata;

        document.querySelector("#test").addEventListener("click", this.TEST.bind(this));

        this.el_graph = document.querySelector("#graph");
        this.el_menu = document.querySelector("#menu");
        this.el_hide_disconnected = document.querySelector("#hide-disconnected");
        this.el_power_max_num = document.querySelector("#power_max_num");
        this.el_power_max = document.querySelector("#power_max");

        this.base_dimensions = [];
        this.selected_dimensions = [];

        this.nodes = new vis.DataSet();
        this.node_obj = {};
        this.edges = new vis.DataSet();
        // let edge_obj = {};

        this.createDimensions();

        // add invert operator
        const inv_row = document.createElement("tr");
        const inv_label = document.createElement("td");
        const inv_cell = document.createElement("td");
        this.el_invert_operator = document.createElement("input");
        this.el_invert_operator.id = "invert-operator";
        this.el_invert_operator.type = "checkbox";
        this.el_invert_operator.value = "^-1";
        this.el_invert_operator.checked = true;
        inv_label.innerHTML = "Invert (^-1)";
        inv_cell.appendChild(this.el_invert_operator);
        inv_row.appendChild(inv_cell);
        inv_row.appendChild(inv_label);
        this.el_menu_subs[0].appendChild(inv_row);

        this.createNodes();

        this.updateEdges();

        this.el_hide_disconnected.addEventListener("input", function() {
            if (this.el_hide_disconnected.checked) {
                this.hideAllNodes();
                this.updateEdges();
            } else {
                this.showAllNodes();
            }
        }.bind(this))

        this.el_invert_operator.addEventListener("input", function() {
            if (this.el_hide_disconnected.checked) {
                this.hideAllNodes();
            }
            this.updateEdges();
        }.bind(this))

        this.el_power_max_num.addEventListener("input", function() {
            this.el_power_max = this.el_power_max_num.value;
            this.updateEdges();
        }.bind(this))

        this.el_power_max.addEventListener("input", function() {
            this.el_power_max_num.value = this.el_power_max.value;
            this.updateEdges();
        }.bind(this))

        // edges.add({
        //     from: "Length",
        //     to: "Angle",
        //     arrows: "to",
        //     label: `/ l`,
        // });

        this.network = new vis.Network(this.el_graph, {
            nodes: this.nodes,
            edges: this.edges,
        }, {
            physics:{
                barnesHut: {
                    springLength: 95,
                    springConstant: 0.04,
                    damping: 0.09,
                    avoidOverlap: 0.2,
            }}
        });
    }

    setup() {
        // runs on reset
    }

    createDimensions() {
        for (let node of this.data) {
            if (node.Symbol == node.Composition) {
                this.base_dimensions.push(node.Symbol);
                this.selected_dimensions.push(node.Symbol);
            }
        }
        for (let node of this.data) {
            node.vector = nj.array(this.calculate_dimension(node.Composition));
            node.magnitude = nj.abs(node.vector).sum();
            if (node.Symbol in this.node_obj) {
                console.log("ERROR, duplicate definition: ", node, this.node_obj[node.Symbol]);
            }
        }
        this.el_menu_subs = [];
        for (let node of this.data) {
            let row = document.createElement("tr");
            let cellbox = document.createElement("td");
            let box = document.createElement("input");
            let cellitem = document.createElement("td");
            box.type = "checkbox";
            box.value = node.Symbol;
            box.id = `unit-${node.Symbol}`;
            box.checked = node.Symbol == node.Composition;
            box.addEventListener("input", function (e) {
                this.toggle_unit(e.target)
                this.updateEdges();
            }.bind(this));
            cellitem.innerHTML = `${node.Unit} (${node.Symbol})`;
            cellbox.appendChild(box);
            row.appendChild(cellbox);
            row.appendChild(cellitem);

            let i = this.el_menu_subs.length;
            while (this.el_menu_subs.length < node.magnitude + 1) {
                const subrh = document.createElement("tr");
                const subh = document.createElement("th");
                const subr = document.createElement("tr");
                const sub = document.createElement("td");
                const subhinp = document.createElement("input");
                subh.innerHTML = i == 0 ? `Base Units` : `Derived Units (${i})`;
                subr.appendChild(sub);
                subh.insertAdjacentElement("afterbegin", subhinp);
                subrh.appendChild(subh);
                subhinp.type = "checkbox";
                subhinp.checked = i == 0;
                subhinp.addEventListener("input", function (e) {
                    const section = e.path[2].nextElementSibling.childNodes[0];
                    for (let row of section.childNodes) {
                        const box = row.childNodes[0].childNodes[0];
                        if (box.checked != e.target.checked) {
                            box.checked = e.target.checked;
                            this.toggle_unit(box);
                        }
                    }
                    this.updateEdges();
                }.bind(this));
                this.el_menu.appendChild(subrh);
                this.el_menu.appendChild(subr);

                this.el_menu_subs.push(sub);
                i++;
            }
            if (node.Symbol == node.Composition) {
                this.el_menu_subs[0].appendChild(row);
            } else {
                this.el_menu_subs[node.magnitude].appendChild(row);
            }
        }
    }

    createNodes() {
        for (let node of this.data) {
            node.id = node.Unit;
            node.label = node.Unit + ` (${node.Symbol})\n` + node.Composition;
            node.color = {
                    background: this.selected_dimensions.indexOf(node.Composition) >= 0 ? "red" : "pink",
                    border: "black",
                    highlight: {
                        border: "white",
                        background: "lightgreen",
                    },
                };
            node.hidden = this.el_hide_disconnected.checked ? true : false;
            this.node_obj[node.Symbol] = node;

            this.nodes.add(node);
        }
    }

    updateEdges() {
        this.edges.clear();
        const power_max = Number(this.el_power_max.value);
        for (let nodea of this.data) {
            for (let nodeb of this.data) {
                if (nodea == nodeb) {
                    continue
                }

                // check dimension vectors
                for (let dimension_symbol of this.selected_dimensions) {
                    const dimension_vector = this.node_obj[dimension_symbol].vector;
                    for (let p=1; p<=power_max; p++) {
                        const p_vector = nj.array(Array(this.base_dimensions.length).fill(p));
                        const scaled_vector = nj.multiply(p_vector, dimension_vector);
                        if (nj.equals(nj.add(nodea.vector, scaled_vector), nodeb.vector)) {
                            this.edges.add({
                                from: nodea.Unit,
                                to: nodeb.Unit,
                                arrows: "to",
                                label: p > 1 ? `* ${dimension_symbol}^${p}` : `* ${dimension_symbol}`,
                            });
                            this.showNode(nodea);
                            this.showNode(nodeb);
                            // nodes.update({id: nodea.Unit, hidden: false});
                            // nodes.update({id: nodeb.Unit, hidden: false});
                        }
                    }
                }

                // check for inversion
                if (this.el_invert_operator.checked) {
                    if (nj.equals(nj.negative(nodea.vector), nodeb.vector) && nodea.Id > nodeb.Id) {
                        this.edges.add({
                            from: nodea.Unit,
                            to: nodeb.Unit,
                            arrows: "to from",
                            label: "^-1",
                        });
                        this.showNode(nodea);
                        this.showNode(nodeb);
                        // nodes.update({id: nodea.Unit, hidden: false});
                        // nodes.update({id: nodeb.Unit, hidden: false});
                    }
                }
            }
        }
    }

    toggle_unit(el_target) {
        if (el_target.id == "invert-operator") {
            return;
        }
        const symbol = el_target.value;
        this.update_unit(symbol, el_target.checked);
    }

    update_unit(symbol, value) {
        let node = this.node_obj[symbol];
        if (value) {
            this.selected_dimensions.push(symbol);
        } else {
            this.selected_dimensions.splice(this.selected_dimensions.indexOf(symbol), 1);
        }

        if (this.selected_dimensions.indexOf(node.Symbol) >= 0) {
            node.color.background = "red";
        } else if (this.base_dimensions.indexOf(node.Symbol) >= 0) {
            node.color.background = "lightblue";
        } else {
            node.color.background = "pink";
        }
        this.nodes.update(node);

        if (this.el_hide_disconnected.checked) {
            this.hideAllNodes();
        }
    }

    calculate_dimension(dimensionstring) {
        let dim = [];
        let [pre, post] = dimensionstring.split("/");
        if (!post) {
            post = "";
        }
        for (let measure of this.base_dimensions) {
            dim.push((pre.match(new RegExp(measure, "g")) || []).length - (post.match(new RegExp(measure, "g")) || []).length);
        }
        return dim;
    }

    // TODO find way to stop hidden nodes from participating in physics, or just remove and re-add
    hideNode(node) {
        this.nodes.update({id: node.Unit, hidden: true, physics: false, size: 0});
    }

    showNode(node) {
        this.nodes.update({id: node.Unit, hidden: false, physics: true, size: 25});
    }

    hideAllNodes() {
        this.nodes.forEach(node => this.hideNode(node));
    }

    showAllNodes() {
        this.nodes.forEach(node => this.showNode(node));
    }

    TEST() {
        console.log("TEST");
    }
}

nj.equals = function(a, b) {
    return JSON.stringify(a.tolist()) == JSON.stringify(b.tolist());
}

let UE = new UnitExplorer("unitcompositions.csv");