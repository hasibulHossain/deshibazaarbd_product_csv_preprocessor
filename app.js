const CSVtoJSON = require('csvtojson');
const JSONtoCSV = require('json2csv').parse;
const fs = require('fs-extra');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const multer = require('multer');

const app = express();

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads')
    },
    filename: (req, file, cb) => {
        cb(null, new Date().getTime() + '--' + file.originalname.replace(/ /gi, '-'))
    }
})

const upload = multer({storage: fileStorage})

app.use(upload.fields([{name: 'product_file', maxCount: 1}, {name: 'image_file', maxCount: 1}]));
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
app.use('/process-matched', express.static(path.join(__dirname, 'process-matched')))
app.use('/process-unmatched', express.static(path.join(__dirname, 'process-unmatched')))

app.get('/',(req, res, next) => {
    res.send(`
        <div style="display: flex; justify-content: center; flex-direction: column; align-items: center; font-size: 40px">
            <h1>Process Your csv</h1>
            <div>
                <form action="/upload" method="POST" enctype="multipart/form-data">
                    <div style="margin-bottom: 15px">
                        <label style="cursor: pointer;" for="product_file">Products Csv</label>
                        <input type="file" name="product_file" id="product_file" accept=".csv" required>
                    </div>
                    <div style="margin-bottom: 15px">
                        <label style="cursor: pointer;" for="image_file">Image Url Csv</label>
                        <input type="file" name="image_file" id="image_file" accept=".csv" required>
                    </div>
                    <button type="submit">Upload</button>
                </form>
            </div>
        </div>
    `)
})



app.post('/upload', (req, res, next) => {
    const files = req.files
    const productFile = files.product_file[0].path;
    const imageFile = files.image_file[0].path;

    const productsCSV = CSVtoJSON().fromFile(`./${productFile}`);
    const imageUrlCSV = CSVtoJSON().fromFile(`./${imageFile}`);
    
    Promise.all([productsCSV, imageUrlCSV]).then(values => {
        const matched = [];
        const unmatched = [];
    
        const products = values[0];
        const imagesUrl = values[1];
    
        products.forEach((product, prodIndex) => {
            const index = imagesUrl.findIndex((imgUrl, index) => {
                // console.log('product name => ', product.name)
                // console.log('product name => ', imagesUrl[prodIndex].image_url)
                if(product && product.name && (product.name.toLowerCase().replace(/-/gi, '').replace(/\s+/g, ' ').trim().replace(/ /gi, '-') + '-deshibazaarbd') === imgUrl.image_url.replace(/'/gi, '').toLowerCase().split('---')[0]) {
                    console.log('found search')
                    return true;
                } else {
                    console.log('found search asdf')
                    return false;
                }
            });
            
            const matchedPhotos = imagesUrl.filter(imgUrl => {
                
                const imageUrl = imgUrl.image_url.replace(/'/gi, '').split('---')[0].toLowerCase();
                const pn = product.name.replace(/ /gi, '-').toLowerCase() + '-deshibazaarbd'; //pn - product name
                
                if(pn === imageUrl || pn + '-1' === imageUrl || pn + '-2' === imageUrl || pn + '-3' === imageUrl || pn + '-4' === imageUrl || pn + '-5' === imageUrl) {
                    return true
                } else {
                    return false
                }
            }).map(item => {
                return item.image_url.replace(/'/gi, '')
            })
            
            const featured_img = matchedPhotos.filter(image_url => {
                return (product.name.toLowerCase().replace(/ /gi, '-') + '-deshibazaarbd').includes(image_url.toLowerCase().split('---')[0])
            });
            const regular_img = matchedPhotos.filter(image_url => !product.name.replace(/ /gi, '-').includes(image_url.split('---')[0])); //@todo need to add regular_img in excel sheet
            
            if(index !== -1) {
                matched.push({...product, featured_image: featured_img.join(''), short_resolation_image: featured_img.join('')})
            } else {
                // console.log('unmatched image => ', imagesUrl[prodIndex])
                unmatched.push({Product_Name: product.name, Image_Name: imagesUrl[prodIndex] && imagesUrl[prodIndex].img_url && imagesUrl[prodIndex].img_url ? imagesUrl[prodIndex].img_url : 'none'})
            }
    
        })

        const matchedProcessedFile = 'Processed-product--' + new Date().getTime() + '.csv';
        const unmatchedProcessedFile = 'Processed-unmatched-product--' + new Date().getTime() + '.csv';
    
        const matchedCsv = JSONtoCSV(matched, { fields: ['business','name','unit','per_unit_value','brand','category','sub_category','sub_category2','price','is_offer_enable','offer_price','featured_image','short_resolation_image','type','keywords','alert_quantity','sku','delivery_time','status','enable_stock','current_stock','description','shipping_charge','image1','image2','image3','image4','image5','image6'] });
        const unmatchedCsv = JSONtoCSV(unmatched, { fields: ["Product_Name", "Image_Name"] });

        // fs.writeFile(`./process-matched/${matchedProcessedFile}`, matchedCsv).then(_ => console.log(`complete successfully: ${matched.length} products`)).catch(_ => console.log('something went wrong!'))
        // fs.writeFile(`./process-unmatched/${unmatchedProcessedFile}`, unmatchedCsv).then(_ => console.log(`Have problem with ${unmatched.length} products`)).catch(_ => console.log('something went wrong!'))

        const processedMatchedWrite =  fs.writeFile(`./process-matched/${matchedProcessedFile}`, matchedCsv)
        const processedUnmatchedWrite = fs.writeFile(`./process-unmatched/${unmatchedProcessedFile}`, unmatchedCsv)

        Promise.all([processedMatchedWrite, processedUnmatchedWrite]).then(values => {
            res.send(`
            <main style="font-size: 40px; text-align: center">
                <h1>Download processed CSV files</h1>
                <div style="margin-bottom: 20px">
                    <p style="color: lime; font-weight: bold">complete successfully: ${matched.length} products</p>
                    <a href="/process-matched/${matchedProcessedFile}">Download Product Csv</a>
                </div>
    
                <div style="margin-bottom: 20px">
                    <p style="color: red; font-weight: bold">Have problem with ${unmatched.length} products</p>
                    <a href="/process-unmatched/${unmatchedProcessedFile}">Download Unmatched Csv</a>
                </div>
                
                <div style="margin-bottom: 20px">
                    <a href="/">Back to homepage</a>
                </div>
            </main>
        `);
        })
    })
})


app.listen(5050);