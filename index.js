const Nightmare = require('nightmare');
const nightmare = Nightmare({ show: true });

const {JSDOM} = require('jsdom');
const {window} = new JSDOM();
const $ = require('jQuery')(window);

const util = require('util');
const fs = require('fs');
const { stringify } = require('querystring');

const mkdir = util.promisify(fs.mkdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

const axios = require('axios');
const { resolve } = require('path');
const { rejects } = require('assert');
const { resolve4 } = require('dns');
const { url } = require('inspector');

let keyword = "讀書會";
let arrLink = [];
let pages = 1;

// TODO: 換頁抓取
// async function searchKeyword(){
//     console.log('start to searching...');
//     for(i=0;i<=10;i++){
//         // changePages(pages)
//         // console.log(pageUrl)
//         await nightmare
//         .goto(changePages(pages))
//         .wait(2000)
//         .catch(error => {
//           console.error('Search failed:', error)
//         });
//         pages++
//     }
       
// };

// async function changePages(pages){
//     let html = `https://old.accupass.com/search/r/0/0/0/0/4/`+pages+`/00010101/99991231?q=` + keyword
//     console.log(pages)
//     console.log(html)
//     throw html
// }

async function parseHtml(){
    console.log('parseHtml');
    // console.log(html);
    for(i=0;i<=10;i++){
        let htmlUrl = `https://old.accupass.com/search/r/0/0/0/0/4/`+pages+`/00010101/99991231?q=` + keyword
    await nightmare
        .goto(htmlUrl)
        .wait(2000)
        .catch(error => {
          console.error('Search failed:', error)
        });
        pages++


    let html = await nightmare.evaluate(()=>{
        return document.documentElement.innerHTML;
    });
    
    let count = 0;

    $(html).find('.apcss-activity-card').each((index, element)=>{
        let name = $(element).find('.apcss-activity-card-body > a').attr('title');
        let date = $(element).find('.apcss-activity-card-date').text().replace(/\n/g,"");
        let href = $(element).find('.apcss-activity-card-body > a').attr('href');

        console.log("name: ", name);
        console.log("date: ", date);
        console.log("href: ", href);

        let obj = {};
        obj.name = name;
        obj.date = date.replace(/\s/g,"");
        obj.href = href;

        arrLink.push(obj);
    })

    await writeJson();
}}

async function getData(){
    console.log('getData');
    let data = JSON.parse(await readFile("output/bookclub.json"));
    console.log('data:', data);

    for(let i = 0; i < data.length; i++){
        const data2 = await parseDetail(data[i].href);

        arrLink[i]["location"]=data2.location;
        arrLink[i]["pics"]=data2.pics;
        arrLink[i]["productSpec"]=data2.productSpec;
    }

    await writeJson();
}

async function parseDetail(url){
    console.log('url:', url);

    let allData = {};
    let picsArray = [];

    await nightmare.goto(url).wait(5000);

    let html = await nightmare.evaluate(()=>{
        return document.documentElement.innerHTML;
    });

    let location = {}
    let allLocation = $(html).find('.style-e6c7200c-event-detail-link > div');
    allLocation.each(function(index, element){
        location = $(this).text().slice(2);
    })
    console.log("location:", location)
    allData["location"] = location

    let pic = $(html).find('.style-d559067e-event-banner-bg').css("background-image").slice(4, -1);
    console.log("src: ", pic);

    picsArray.push(pic);
    allData["pics"] = picsArray;
    console.log(allData);

    let productSpec = {};
    let allProductSpec = $(html).find('.style-225f7a48-event-content');
    allProductSpec.each(function(index, element){
        productSpec["活動內容"] = $(this).text();
    })

    allData["productSpec"] = productSpec;

    console.log(allData)
    return allData;

}

async function downloadImgs(){
    let data = JSON.parse(await readFile("output/bookclub.json"))
    // console.log('data', data);

    for (let i = 0; i <= data.length; i++) {
        console.log('downloadImg i=', i);
        let rootDir = './img';
        if(!fs.existsSync(rootDir)) fs.mkdirSync(rootDir);

        let keyword = './img/' + 'event';
        if(!fs.existsSync(keyword)) fs.mkdirSync(keyword);

        let picsDir = './img/event/'+ data[i].name.replace(/\//g,"");
        if(!fs.existsSync(picsDir)) fs.mkdirSync(picsDir);

        for(let picNum = 0; picNum < data[i].pics.length; picNum++){
            const url = data[i].pics[picNum];
            const filename = picsDir + '/' + picNum + '.jpg';
            await downloadEachPic(url, filename);

        }
    }
}

const downloadEachPic = (url, filename)=>{
    axios({
        url,
        responseType: "stream"
    }).then(response => 
        new Promise((resolve, reject) => {
            response.data.pipe(fs.createWriteStream(filename))
            .on("finish", ()=>resolve())
            .on("error", e=>reject(e))
        })
    )
}

async function writeJson(){
    if(!fs.existsSync("output")){
        await mkdir("output", {recursive: true});
    }

    await writeFile(
        "output/" + 'bookclub' + ".json",
        JSON.stringify(arrLink, null, 2)
    )
}

async function close(){
    await nightmare.end((err)=>{
        if (err) throw err;
        console.log('nightmare is closed.');
    })
};

async function asyncArray(functionList){
    for (let func of functionList){
        await func()
    };
};


try{
    asyncArray([ parseHtml, getData, close])
    // asyncArray([downloadImgs])
    .then(async ()=>{
        console.log('Done.');
    });
}catch(err){
    console.log('err: ', err);
};