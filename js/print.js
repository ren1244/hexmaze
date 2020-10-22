import 'jquery';
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../css/print.css';
import PdfMazeWorker from './pdfMaze.worker.js';

let pdfWorker=new PdfMazeWorker();
let pdfUrl=false;
pdfWorker.onmessage=function(e) {
    ({
        notify(pageIdx) {
            document.querySelector('#progressLog').textContent=`完成第 ${pageIdx} 頁`;
        },
        done(pdfContent) {
            if(pdfUrl) {
                URL.revokeObjectURL(pdfUrl);
            }
            pdfUrl=URL.createObjectURL(new Blob([pdfContent], {type:'application/pdf'}));
            $('#progress').modal('hide');
            document.querySelector('#pdfShow').removeAttribute('style');
            document.querySelector('#pdfShowFram').src=pdfUrl;
        }
    }[e.data.type])(e.data.data);
}
const cfg={
    'Lv.0': [7.8, 9, 7, 'Lv.0'],
    'Lv.1': [6.6, 10, 9, 'Lv.1'],
    'Lv.2': [5.9, 12, 10, 'Lv.2'],
    'Lv.2+': [5.9, 17, 15, 'Lv.2+'],
    'Lv.3': [4.9, 15, 12, 'Lv.3'],
    'Lv.3+': [4.5, 23, 19, 'Lv.3+'],
    '競速': [3.8, 41, 33, '競速'],
    '史詩': [2.9, 54, 43, '史詩'],
    '神話': [2.2, 71, 57, '神話'],
    '競速(省紙)': [2.72, 39, 33, '競速']
}
let tmpElement=null;

document.addEventListener('DOMContentLoaded', ()=>{
    document.querySelector('#addNewPage>svg').addEventListener('click', ()=>{
        $('#pageSelector').modal('show');
    });
    document.querySelector('#download svg').addEventListener('click', ()=>{
        $('#downloadOptions').modal('show');
    });
    document.querySelectorAll('#pageSelectorOption svg').forEach(svgEle=>{
        svgEle.addEventListener('click', (e)=>{
            appendPage(e.currentTarget);
            checkAndDl();
            $('#pageSelector').modal('hide');
        })
    });
    document.querySelector('#downloadOptions .modal-footer button').addEventListener('click', getPdf);
    document.querySelectorAll('.mazeButton').forEach(ele=>{
        ele.addEventListener('click', (e)=>{
            if(!tmpElement) {
                return;
            }
            const key=e.currentTarget.textContent;
            const textId=parseInt(tmpElement.dataset['textid'], 10);
            const textEle=tmpElement.parentElement.querySelectorAll('text')[
                textId
            ];
            tmpElement.dataset.key=key;
            textEle.textContent=cfg[key][3];
            textEle.setAttributeNS(null, 'class', 'svg-text-set');
            for(let ele=e.currentTarget;ele;ele=ele.parentElement){
                if(ele.classList.contains('modal')) {
                    $(ele).modal('hide');
                    break;
                }
            }
            checkAndDl();
        });
    });
});
/* javascript:(location.href=document.querySelector('#dlbutton').href)*/
function checkAndDl() {
    let dlEle=document.querySelector('#download');
    let rects=document.querySelectorAll('#pageList .page-grid:not([data-key])');
    if(rects.length>0 || document.querySelector('#pageList').children.length<=2) {
        dlEle.style.display='none';
    } else {
        dlEle.removeAttribute('style');
    }
}

function popupDialog(id) {
    const coverEle=document.querySelector('#cover');
    Array.from(coverEle.children).forEach(ele => {
        let cid=ele.id;
        if(cid===id) {
            ele.removeAttribute('style');
        } else {
            ele.style.display='none';
        }
    });
    document.querySelector('#cover').removeAttribute('style');
}
function closeDialog() {
    document.querySelector('#cover').style.display='none';
}
function selectMaze1(e) {
    tmpElement=e.currentTarget;
    $('#mazeSelector1').modal('show');
}
function selectMaze2(e) {
    tmpElement=e.currentTarget;
    $('#mazeSelector2').modal('show');
}
function selectMaze4(e) {
    tmpElement=e.currentTarget;
    $('#mazeSelector4').modal('show');
}
function delPage(e) {
    let div=e.currentTarget.parentElement.parentElement;
    div.parentElement.removeChild(div);
    checkAndDl();
}
function appendPage(templateNode) {
    let div=document.createElement('div');
    let div2=document.createElement('div');
    div.appendChild(div2);
    div.className='pageList-div';
    div2.innerHTML='<span class="del">刪除</span>';
    let node=templateNode.cloneNode(true);
    let pEle=document.querySelector('#pageList');
    let refEle=document.querySelector('#addNewPage');
    div.insertBefore(node, div2);
    pEle.insertBefore(div, refEle);
    //添加事件
    const evtMap={
        '.layout-1': selectMaze1,
        '.layout-2': selectMaze2,
        '.layout-4': selectMaze4
    };
    node.querySelectorAll('text').forEach(tEle=>{
        tEle.textContent='請選擇';
        tEle.setAttribute('class', 'svg-text-hint');
    });
    div.querySelector('.del').addEventListener('click', delPage);
    for(let k in evtMap) {
        let eles=node.querySelectorAll(k);
        let f=evtMap[k];
        if(eles.length>0) {
            eles.forEach(ele=>{
                ele.addEventListener('click', f);
            })
        }
    }
}

function getPdf() {
    //將 pageList 的資料轉為 
    const pages=document.querySelectorAll('#pageList svg[data-layout]');
    const data=Array.from(pages).map(svgEle=>{
        return Array.from(svgEle.querySelectorAll('.page-grid')).map(rectEle=>{
            const key=rectEle.dataset.key;
            const align=parseInt(rectEle.dataset.align, 10);
            let arr=cfg[key].slice(0,3);
            arr.push(align);
            return arr;
        });
    });
    const m=data.length;
    const n=parseInt(document.querySelector('#repeatCount').value, 10);
    for(let i=1;i<n;++i){
        for(let j=0;j<m;++j) {
            data.push(data[j]);
        }
    }
    document.querySelector('#progressLog').textContent='';
    $('#downloadOptions').modal('hide');
    $('#progress').modal({
        backdrop: 'static'
    });
    pdfWorker.postMessage(data);
}