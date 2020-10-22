const pako=require('pako');

function PDF()
{
    this.pages=[];
    this.currentPage=null;
    this.streams=[];
}

/**
 * 新增一個頁面
 */
PDF.prototype.addPage=function()
{
    let newPage={
        contents: [] //儲存 index of stream
    }
    this.currentPage=newPage;
    this.pages.push(newPage);
}

/**
 * 將 stream 資料寫入 pdf 中
 * @param {string} streamContent 要被寫入的 stream
 */
PDF.prototype.addStream=function(streamContent)
{
    if(this.pages.length<1) {
        this.addPage(); //至少1頁
    }
    this.currentPage.contents.push(this.streams.length);
    let input=new Uint8Array(streamContent.length);
    for(let i=streamContent.length;i-->0;) {
        input[i]=streamContent.codePointAt(i);
    }
    streamContent=pako.deflate(input,{level: 9});
    this.streams.push(streamContent);
}

/**
 * 輸出 pdf 內容
 * @returns {string} pdf 內容
 */
PDF.prototype.done=function()
{
    let objCount=0;
    let result=['%PDF-1.7'];
    let pos=result[0].length+1;
    let dictPos=[pos];

    if(this.pages.length<1) {
        this.addPage(); //至少1頁
    }
    //Catalog
    addDict('/Type /Catalog\n/Pages 2 0 R');
    //Pages
    let firstPageId=objCount+2;
    let pageKids=this.pages.reduce((r, v, i)=>{
        r.push(`${firstPageId+i} 0 R`);
        return r;
    },[]).join(' ');
    addDict(`/Type /Pages\n/Kids [${pageKids}]\n/Count ${this.pages.length}`);
    //page
    let firstStreamId=objCount+this.pages.length+1;
    this.pages.forEach((page)=>{
        let streamList=page.contents.reduce((r, v)=>{
            r.push(`${firstStreamId+v} 0 R`);
            return r;
        },[]).join(' ');
        addDict(`/Type /Page
/Parent 2 0 R
/Resources <<>>
/MediaBox [0 0 595.27559 841.8976]
/Contents [${streamList}]`);
    });
    //Contents
    this.streams.forEach((streamContent)=>{
        addDict(streamContent, 1);
    });
    //xref
    result.push(`xref\n0 ${objCount+1}\n0000000000 65535 f `);
    for(let i=0;i<objCount;++i) {
        result.push(`0000000000${dictPos[i]}`.slice(-10)+' 00000 n ');
    }
    //trailer
    result.push(`trailer
<<
/Size ${objCount}
/Root 1 0 R
>>
startxref
${dictPos[objCount]}
%%EOF`);
    //output
    return outputAsUint8Array(result);
    /**
     * 添加 dict
     * @param {string} content object 內容
     * @param {bool} isStream content 為 stream 時設為 true
     */
    function addDict(content, isStream) {
        pushLine(`${++objCount} 0 obj\n<<`);
        if(isStream) {
            pushLine(`/Length ${content.length}\n/Filter /FlateDecode\n>>`);
            pushLine(`stream`);
            pushLine(content);
            pushLine(`endstream`);
        } else {
            pushLine(`${content}\n>>`);
        }
        pushLine('endobj');
        dictPos.push(pos);
        function pushLine(data) {
            pos+=data.length+1;
            result.push(data);
        }
    }

    /**
     * 將 rersult 轉換為 Uint8Array
     */
    function outputAsUint8Array(result) {
        let sz=result.reduce((sum, data)=>sum+data.length+1, 0);
        let arr=new Uint8Array(sz);
        let k=0;
        result.forEach(data=>{
            if(typeof(data)==='string') {
                for(let i=0, n=data.length; i<n; ++i) {
                    arr[k++]=data.codePointAt(i);
                }
            } else {
                arr.set(data, k);
                k+=data.length;
            }
            arr[k++]=10; // '\n'
        });
        if(k!==arr.length) {
            throw new Error('不相等');
        }
        return arr;
    }
}


try{
	module.exports=PDF;
} catch {
	
}