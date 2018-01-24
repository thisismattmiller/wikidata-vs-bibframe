const fs = require('fs')
const request = require('request')
const H = require('highland')
const wdk = require('wikidata-sdk')

var allIds = []
var pLookup = {}
var pstats = {}


var download = function(id,callback){



		var url = wdk.getEntities({
		  ids: id,
		  languages: ['en'], // returns all languages if not specified
		  // props: ['labels','claims'], // returns all data if not specified
		  format: 'json' // defaults to json
		})


		request({
		    url: url,
		    method: 'GET',
		}, function(error, response, body) {
		    if (error) {
		        console.log(error)
		        console.log('Skipping',url)
		        callback(null,{})
		    } else {					    	
		    	data = JSON.parse(body)



	    		Object.keys(data.entities[id].claims).forEach((p)=>{
	    			if (!pstats[p]) pstats[p] = { count : 0, label: pLookup[p] }
	    			pstats[p].count++
	    		})

		    	// console.log(url)
	
				callback(null,data)

		    }
		})

}




var counter = 0

console.log("downloading book list")
request({
    url: "https://query.wikidata.org/sparql?query=SELECT%20%3Fitem%20WHERE%20%7B%0A%20%20%20%20%3Fitem%20p%3AP31%2Fps%3AP31%2Fwdt%3AP279*%20wd%3AQ571.%20%20%23%20Item%27s%20type%20is%3A%20bridge%20or%20sub-type%20or%20sub-sub-type%2Fetc%0A%7D&format=json",
    method: 'GET',
}, function(error, response, body) {
    if (error) {
        console.log(error);
    } else {


    	allIds = JSON.parse(body).results.bindings.map((item)=>{
    		return item.item.value.split('/entity/')[1]
    	})

    	console.log("download all property names")

		request({
		    url: "https://query.wikidata.org/sparql?query=SELECT%20%3Fproperty%20%3FpropertyLabel%20WHERE%20%7B%0A%20%20%20%20%3Fproperty%20a%20wikibase%3AProperty%20.%0A%20%20%20%20SERVICE%20wikibase%3Alabel%20%7B%0A%20%20%20%20%20%20bd%3AserviceParam%20wikibase%3Alanguage%20%22en%22%20.%0A%20%20%20%7D%0A%20%7D%0A%0A&format=json",
		    method: 'GET',
		}, function(error, response, body) {
		    if (error) {
		        console.log(error);
		    } else {

		    	data = JSON.parse(body)

		    	data.results.bindings.forEach((b)=>{
		    		var p = b.property.value.replace('http://www.wikidata.org/entity/','')
		    		var l = b.propertyLabel.value
		    		pLookup[p] = l
		    	})

				H(allIds)
					.map(H.curry(download))
				    .nfcall([])
				    .parallel(10)
				    .map(()=>{
				    
				    	if (++counter % 100 === 0) console.log(`\n\n\n\n${counter} / ${allIds.length}\n\n\n\n`)
				    })
					.done(()=>{
			    	

						var items = Object.keys(pstats).map(function(key) {
						    return [key + ' -  ' + pstats[key].label, pstats[key].count];
						});

						// Sort the array based on the second element
						items.sort(function(first, second) {
						    return second[1] - first[1];
						});

						var results = {}

						items.forEach((i)=>{
							results[i[0]] = {count: i[1], percent: i[1]/allIds.length*100}
						})

						fs.writeFileSync("results.json",JSON.stringify(results,null,2))




					})


		    }
		})
	}
})



// H(all_people)
// 	.map()

// console.log(all_people)