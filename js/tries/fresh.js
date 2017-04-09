var linknum = 0;
var sites = [];
var fs = require('fs');
var phantom = fs.absolute('../../node_modules/phantomjs/modules');
var path = fs.absolute('../../node_modules/casperjs/modules');
require.paths.push(phantom);
require.paths.push(path);

sites = readWebsitesFromCSV();

var casper = require('casper').create({
	verbose : true,
	logLevel : 'debug'
});

casper.start().then(function(){
    this.echo("heeee"+sites)
	this.echo(require.paths)
});


casper.run(check)


function start(link){
    this.start(link, function(){
        this.echo("Page title" + this.getTitle());
    });
}
function check(){
    if(sites[linknum]){
        var current = sites[linknum];
        start.call(this, current)
        linknum++;
        this.run(check);
    }else{
        this.echo("All done")
        this.exit();
    }
}



 
// //Function to read links from CSV file
function readWebsitesFromCSV(){
    //Script starts
    var stream = fs.open('../data/summa.csv','r');
    var reading = stream.read().split(/\r?\n/);
    var result = reading.map(function(val, index, arr){
        return val = "https://www." + val.split(',')[1];
    });
    stream.close();
    return result;
}