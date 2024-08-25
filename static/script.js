document.getElementById('fileInput').addEventListener('change', function () {
    const fileName = this.files.length > 0 ? this.files[0].name : 'No file chosen';
    document.getElementById('fileName').textContent = fileName;
});
document.getElementById('convertBtn').addEventListener('click', function () {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files.length) {
        alert('Please select an Excel file.');
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        const xmlOutput = generateXML(json);
        document.getElementById('output').textContent = xmlOutput;
        downloadXML(xmlOutput, file.name.replace(/\.[^/.]+$/, "") + '_tally.xml');
    };

    reader.readAsArrayBuffer(file);
});

function generateXML(data) {
    let xml = '<ENVELOPE>\n';
    xml += '\t<HEADER>\n\t\t<TALLYREQUEST>Import Data</TALLYREQUEST>\n\t</HEADER>\n';
    xml += '\t<BODY>\n\t\t<IMPORTDATA>\n\t\t\t<REQUESTDESC>\n\t\t\t\t<REPORTNAME>All Masters</REPORTNAME>\n';
    xml += '\t\t\t\t<STATICVARIABLES>\n\t\t\t\t\t<SVCURRENTCOMPANY></SVCURRENTCOMPANY>\n\t\t\t\t</STATICVARIABLES>\n';
    xml += '\t\t\t</REQUESTDESC>\n\t\t\t<REQUESTDATA>\n';

    data.forEach(row => {
        xml += '\t\t\t\t<TALLYMESSAGE xmlns:UDF="TallyUDF">\n';
        xml += `\t\t\t\t\t<VOUCHER ACTION="Create" VCHTYPE="${row['VOUCHER TYPE']}">\n`;
        xml += `\t\t\t\t\t\t<VOUCHERTYPENAME>${row['VOUCHER TYPE']}</VOUCHERTYPENAME>\n`;
        xml += `\t\t\t\t\t\t<DATE>${formatDate(row['DATE'])}</DATE>\n`;
        xml += `\t\t\t\t\t\t<VOUCHERNUMBER>${row['VOUCHER NUMBER']}</VOUCHERNUMBER>\n`;
        xml += `\t\t\t\t\t\t<REFERENCE>${row['REFERENCE NUMBER']}</REFERENCE>\n`;
        xml += `\t\t\t\t\t\t<PARTYLEDGERNAME>${row['LEDGER NAME DR/CR 1']}</PARTYLEDGERNAME>\n`;
        xml += `\t\t\t\t\t\t<NARRATION>${row['STANDARD NARRATION']}</NARRATION>\n`;
        xml += `\t\t\t\t\t\t<EFFECTIVEDATE>${formatDate(row['DATE'])}</EFFECTIVEDATE>\n`;

        for (let i = 1; i <= 30; i++) {
            if (row[`LEDGER NAME DR/CR ${i}`]) {
                const amount = row[`EFFECT ${i}`] === 'Debit' ? '-' : '';
                xml += `\t\t\t\t\t\t<ALLLEDGERENTRIES.LIST>\n`;
                xml += `\t\t\t\t\t\t\t<LEDGERNAME>${row[`LEDGER NAME DR/CR ${i}`]}</LEDGERNAME>\n`;
                xml += `\t\t\t\t\t\t\t<REMOVEZEROENTRIES>NO</REMOVEZEROENTRIES>\n`;
                xml += `\t\t\t\t\t\t\t<LEDGERFROMITEM>NO</LEDGERFROMITEM>\n`;
                xml += `\t\t\t\t\t\t\t<ISDEEMEDPOSITIVE>${row[`EFFECT ${i}`] === 'Credit' ? 'NO' : 'YES'}</ISDEEMEDPOSITIVE>\n`;
                xml += `\t\t\t\t\t\t\t<AMOUNT>${amount}${row[`AMOUNT ${i}`]}</AMOUNT>\n`;
                xml += `\t\t\t\t\t\t</ALLLEDGERENTRIES.LIST>\n`;
            }
        }

        xml += `\t\t\t\t\t</VOUCHER>\n`;
        xml += '\t\t\t\t</TALLYMESSAGE>\n';
    });

    xml += '\t\t\t</REQUESTDATA>\n';
    xml += '\t\t</IMPORTDATA>\n\t</BODY>\n</ENVELOPE>\n';
    return xml;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${year}${month}${day}`;
}

function downloadXML(xml, filename) {
    const blob = new Blob([xml], { type: 'application/xml' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}