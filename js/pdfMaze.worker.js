const PDF=require('./pdf.js');
const HexMaze=require('./hexmaze.js');
/**
 * 接收資料(e.data)格式
 * [
 *    [ //每頁
 *       [edgeSizeInMm, width, height, alignment],
 *       ...
 *    ]
 *    ...
 * ]
 * 
 * 輸出資料
 * {
 *    tpye: 'notify' 或 'done'
 *    data: 處理進度(type='notify') 或 pdf 內容字串(type=done)
 * }
 */
onmessage=function(e) {
    let pdf=new PDF();
    e.data.forEach((page, pageIdx) => {
        pdf.addPage();
        page.forEach((mazeCfg)=>{
            let edgeLen=mazeCfg[0],
                m=mazeCfg[2],
                n=mazeCfg[1],
                alignment=mazeCfg[3],
                step=Math.round(Math.min(m, n)*2/3);
            let maze=new HexMaze(m, n, true, step);
            let pathInfo=maze.getPaths();
            let stream=getPostScript(pathInfo, edgeLen, alignment);
            pdf.addStream(stream);
        });
        postMessage({
            type: 'notify',
            data: pageIdx+1
        });
    });
    postMessage({
        type: 'done',
        data: pdf.done()
    });

    function getPostScript(pathInfo, edgeLen, alignment) {
        //先畫迷宮
        let arr=[getCMT(pathInfo, edgeLen, alignment)];
        pathInfo.maze.forEach((pObj)=>{
            arr.push(getPathScript(pObj));
        });
        arr.push('S');
        //再畫箭頭
        arr.push('0.55 0.55 0.55 rg');
        arr.push(getPathScript(pathInfo.arrow));
        arr.push('f Q');
        return arr.join(' ');
    
        function getPathScript(pObj) {
            const n=pObj.length;
            const mMask=HexMaze.prototype.MOVE_MASK;
            const cMask=HexMaze.prototype.CURVE_MASK;
            const zMask=HexMaze.prototype.CLOSE_MASK;
            const vMask=HexMaze.prototype.VALUE_MASK;
            let s=[];
            for(let i=0;i<n;++i) {
                let x=pObj.x[i];
                let y=pObj.y[i];
                if(x&mMask) {
                    s.push(`${x&vMask} ${y} m`);
                } else if(x&cMask){
                    ++i;
                    let x2=pObj.x[i];
                    let y2=pObj.y[i];
                    s.push(`${x&vMask} ${y} ${x&vMask} ${y} ${x2&vMask} ${y2} c`);
                } else if(x&zMask){
                    s.push(`h`);
                } else {
                    s.push(`${x&vMask} ${y} l`);
                }
            }
            return s.join(' ');
        }

        function getCMT(pathInfo, edgeLen, alignment) {
            const radio=72*edgeLen/25400;
            const lineWidth=0.75/radio;
            const CMT={
                7: `q ${lineWidth} w 0 -${radio} ${radio} 0 28.35 813.53976 cm `,
                9: `q ${lineWidth} w 0 -${radio} -${radio} 0 566.92559 813.53976 cm `,
                1: `q ${lineWidth} w 0 ${radio} ${radio} 0 28.35 28.35 cm `,
                3: `q ${lineWidth} w 0 ${radio} -${radio} 0 566.92559 28.35 cm `,
                5: `q ${lineWidth} w 0 ${radio} ${radio} 0 ${595.27559/2-(pathInfo.yMax-pathInfo.yMin)*radio/2} ${841.88996/2-(pathInfo.xMax-pathInfo.xMin)*radio/2} cm `,
                8: `q ${lineWidth} w ${radio} 0 0 -${radio} ${595.27559/2-(pathInfo.xMax-pathInfo.xMin)*radio/2} 813.53976 cm `,
                2: `q ${lineWidth} w ${radio} 0 0 ${radio} ${595.27559/2-(pathInfo.xMax-pathInfo.xMin)*radio/2} 28.35 cm `
            }
            return CMT[alignment];
        }
    }
}