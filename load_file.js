export function loadText(file, callback) {
    var xobj = new XMLHttpRequest();
    xobj.overrideMimeType("text");
    xobj.open('GET', file, true);
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4 && xobj.status == "200") {
            callback(xobj.responseText);
        }
    };
    xobj.send(null);
}

export function loadJSON(file, callback) {
    loadText(file, function(text) {
        callback(JSON.parse(text));
    })
}

export function loadCSVtoAoO(file, callback) {
    loadText(file, function(text) {
        callback(CSV2AoO(text));
    })
}

export function loadCSVtoAoA(file, callback) {
    loadText(file, function(text) {
        callback(CSV2AoA(text));
    })
}

export function CSV2AoA(allText) {
    var allTextLines = allText.split(/\r\n|\n/);
    var headers = allTextLines[0].split(',');
    var lines = [];

    for (var i=1; i<allTextLines.length; i++) {
        var data = allTextLines[i].split(',');
        if (data.length == headers.length) {

            var tarr = [];
            for (var j=0; j<headers.length; j++) {
                tarr.push(headers[j]+":"+data[j]);
            }
            lines.push(tarr);
        }
    }
    // alert(lines);
}

export function CSV2AoO(csv_text, linedelim="\n", valdelim=","){
    const lines = csv_text.split(linedelim);
    let result = [];
    const headers = lines[0].split(valdelim).map(h => h.trim());
    for (let i = 1; i < lines.length; i++){
        if (lines[i].length == 0) {
            continue;
        }
        let currentline = lines[i].split(valdelim).map(v => v.trim());
        if (currentline.length != headers.length) {
            throw("Inconsistent number of fields");
        }
        let obj = {};
        for (let j = 0; j < headers.length; j++){
            obj[headers[j]] = currentline[j];
        }
        result.push(obj);
    }
    return result;
}