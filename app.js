const CSVtoJSON = require('csvtojson');
const JSONtoCSV = require('json2csv').parse;
const fs = require('fs');


CSVtoJSON().fromFile("./united_states.csv").then(source => {
    const sanitizeData = [];
    source.forEach(item => {
        if (item.registrant_email.includes('gmail.com')) {
            // console.log('Name => ', item.domain_name);
            // console.log({ domainName: item.domain_name, email: item.registrant_email, domainProvider: item.domain_registrar_name });
            sanitizeData.push({
                domainName: item.domain_name, email: item.registrant_email, domainProvider: item.domain_registrar_name
            })
        }
        // if (item.registrant_email && !item.registrant_email.includes('protect' || '') && !item.registrant_email.includes('proxy') && !item.registrant_email.includes('privacy') && !item.registrant_email.includes('dropcatch') && !item.registrant_email.includes('private') && !item.registrant_email.includes('domains') && !item.registrant_email.includes('whois') && !item.registrant_email.includes('newvcorp') && !item.registrant_email.includes('domain')) {
        //     // console.log('Name => ', item.domain_name);
        //     console.log({ domainName: item.domain_name, email: item.registrant_email, domainProvider: item.domain_registrar_name });
        // }
    })
    // console.log(source);
    // source.push({
    //     "sku": "2342",
    //     "title": "fornitdu",
    //     "hardware": "Ninetendo wsdf",
    //     "price": "2323"
    // })
    const csv = JSONtoCSV(sanitizeData, { fields: ["domainName", "email", "domainProvider"] });
    fs.writeFileSync("./data.csv", csv);
})