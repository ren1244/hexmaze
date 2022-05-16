/*
資料型態：
	HexMaze物件:
		int m;
		int n;
		bool flag;
		int A[];
	pathInfo物件:
		pathObject[] maze;
		pathObject arrow;
		pathObject solution;
		int xMin;
		int yMin;
		int xMax;
		int yMax;
	pathObject
		int[] x; //x座標
		int[] y; //y座標
		int length;
		註：
		* x 座標在高 bits 含其他資訊，取值需跟 HexMaze.prototype.VALUE_MASK 做 and 運算
		* x & HexMaze.prototype.MOVE_MASK 判斷這個點是 move
		* x & HexMaze.prototype.CURVE_MASK 判斷這個點開始為二次貝茲曲線
		* x & HexMaze.prototype.CLOSE_MASK 代表曲線閉合，其 x,y 值會是閉合點
		* 如果 x 不是 move curve close ，則為 line
使用介面：
	建構：HexMaze(h,w,f,step) //產生w(+1) x h 的迷宮
	Show_svg(r,with_sol) //回傳迷宮svg圖片字串
	RandomMaze(step) //重新亂數產生迷宮
	getPaths() //回傳 pathInfo 物件
	enableStand(x, y) //判斷 x, y 是否可站立（撞牆或超出迷宮範圍回傳 false），牆壁邊長為 1000
	setWallThickness(wallThickness) //設定牆壁厚度，這會影響可站立範圍，此值應介於 (0, 866)
開發介面：
	[轉換]
	ConvToMN(index) //將index轉換為object{m,n,o},o代表該row是否+1
	ConvToIndex(m,n) //m,n轉換為index
	[取得資訊]
	IsInRangeNear(index,k) //檢查A[index]格子往k方向的格子是否存在
	GetNearInfo(index,k) //回傳A[index]格子往k方向的格子的index，若不存在回傳-1
	IsTheSameGroup(index,k) //檢查A[index]格子與其往k方向的格子是否屬於同一個群組
	GetRandNear(index) //亂數取得一個可以打通的方向0~5，沒有傳回-1
	[動作/設值]
	GetSolution(idi,idf) //回傳解答的array字串，由Show_svg呼叫
	RefreshGroup(index,new_g) //以index為起始點及其鄰近同群組編號的格子，都填上新的群組編號
備註：
	方向：以wsxqaz代表的話，依序為012345，對角線相加為5，%3及/3可判斷上下左右
	（0右上, 1正右, 2右下, 3左上, 4正左, 5左下）
	A[]最低6個位元儲存了方向的牆壁是否打開(0打開1不可通過)，6位元以上為群組
*/
Number.prototype.ffix=function(fixed)
{
	if(this-Math.floor(this)==0)
		return this;
	else
		return fixed<0?this:this.toFixed(fixed);
}
var bit=[0,1,2,5,4,3];
function HexMaze(h,w,f,step) // w(+1) x h 的迷宮
{
	w=(typeof(w)!="number" || w<1)?1:Math.floor(w);
	h=(typeof(h)!="number" || w<1)?1:Math.floor(h);
	f=(typeof(f)!="boolean")?true:f;
	this.m=h;
	this.n=w;
	this.flag=f;
	this.A=[];
	this.pathCache=null;
	this.RandomMaze(step);
	this.wallThickness = 100;
}
HexMaze.prototype.ConvToMN=function(idx)
{
	var q1=(2*this.n+1);
	var t1=(idx/q1|0);
	idx-=t1*q1;
	var q2=this.n+(this.flag?1:0);
	var t2=idx>=q2?1:0;
	idx-=t2*q2;
	return {m:2*t1+t2,n:idx,o:(t2+(this.flag?1:0))%2};
}
HexMaze.prototype.ConvToIndex=function(m,n)
{
	var q1=(2*this.n+1);
	var q2=this.n+(this.flag?1:0);
	var q3 = this.n + (m + (this.flag?1:0) & 1);
	if(n<0 || n>=q3 || m<0 || m>=this.m) {
		return -1;
	}
	return (m>>>1)*q1+(m%2)*q2+n;
}
HexMaze.prototype.IsInRangeNear=function(idx,k) //檢查A[idx]格子往k方向的格子是否存在
{
	var L1=this.n+(this.flag?1:0);
	var L2=2*this.n+1;
	if((k<3 && idx%L2==(this.flag?L1-1:L2-1)) || (k==1 && idx%L2==(!this.flag?L1-1:L2-1))) //檢查右側
		return false;
	if((k>=3 && idx%L2==(this.flag?0:L1)) || (k==4 && idx%L2==(!this.flag?0:L1)))//檢查左側
		return false;
	if(k%3==0 && idx<L1) //檢查上方
		return false;
	if(k%3==2 && idx>=((this.m-1)/2|0)*L2+(this.m-1)%2*L1) //檢查下方
		return false;
	return true;
}
HexMaze.prototype.GetNearInfo=function(idx,k) //return near_index or -1(out of range)
{
	var B=[-this.n,1,this.n+1,-this.n-1,-1,this.n];
	return this.IsInRangeNear(idx,k)?idx+B[k]:-1;
}
HexMaze.prototype.IsTheSameGroup=function(idx,k)
{//使用前需先檢查idx與鄰近k不超出範圍。這邊不會檢查
	var idx2=this.GetNearInfo(idx,k);
	return ((this.A[idx]>>6)==(this.A[idx2]>>6) || (this.A[idx2]>>6)==0?true:false);
}
HexMaze.prototype.RandomMaze=function(step)
{
	if(step==undefined)
		step=1;
	//init maze
	this.pathCache=null;
	/**
	 * flag 決定要在 odd row 還是 even row 行多1格
	 * flag=true 為單數行，flag=flase 為偶數行
	 */
	this.A=[]; //A.length=w*h+((h+(f?1:0))/2|0);
	var iL=this.n*this.m+((this.m+(this.flag?1:0))/2|0);
	for(var i=0;i<iL;++i) {
		//設定群組的值(6bit以上部分)以及牆壁(6bit以內部分)
		this.A[i]=((i+1)<<6)|63;//Math.floor(Math.random()*64);
	}
	//init finish
	var B=[], //邊界格，儲存A的index，如果不是在不同群組邊界會被移除。
		r,
		rd,
		tmp,
		t,
		len=this.A.length, //群組數
		count=0; //連續打開格子的計數器
	for(var i=0,L=len;i<L;++i) {
		B[i]=i;
	}
	while (len>2)
	{
		if(count==0) {
			count=step;
			r=Math.floor(Math.random()*len);
		}
		else {
			//找 B[r]==tmp 的 r
			for(r=0;r<len && B[r]!=tmp;++r);
		}
		//亂數取 B[r] 鄰近的格子的方向(0-5)
		rd=this.GetRandNear(B[r]);
		if(rd==-1) { //如果找不到就移除這個格子(代表B[r]不是邊界了)
			this.A[B[r]]&=63;
			B[r]=B[--len];
			count=0;
		}
		else { //打通牆壁
			//link
			this.A[B[r]]=(this.A[B[r]]&~(1<<rd));
			tmp=this.GetNearInfo(B[r],rd);
			this.A[tmp]=(this.A[tmp]&~(1<<(5-rd)));
			//refresh group
			this.RefreshGroup(tmp,this.A[B[r]]>>6);
			--count;
		}
	}
	this.final=this.findMaxPos(0);
	this.start=this.findMaxPos(this.final);	
}
HexMaze.prototype.RefreshGroup=function(idx,new_g)
{
	var old_g=this.A[idx]>>6;
	var stack=[{i:idx,k:0}];
	var lidx,loc,ti;
	this.A[idx]=((this.A[idx]&63)|(new_g<<6));
	while((lidx=stack.length-1)>=0)
	{
		if(stack[lidx].k>=6)
		{
			stack.pop();
			continue;
		}
		ti=this.GetNearInfo(stack[lidx].i,stack[lidx].k);
		if(ti>=0 && (this.A[ti]>>6) == old_g)
		{
			this.A[ti]=((this.A[ti]&63)|(new_g<<6)); 
			stack.push({i:ti,k:0});
		}
		++(stack[lidx].k);
	}
}
HexMaze.prototype.GetRandNear=function(imn) //回傳一個可以打通的方向[0,5]做連結，沒有傳回-1
{
	var tmp=[];
	for(var k=0;k<6;++k)
		if(this.IsInRangeNear(imn,k) && !this.IsTheSameGroup(imn,k))
			tmp[tmp.length]=k;
	if(tmp.length<1)
		return -1;
	return tmp[Math.floor(Math.random()*tmp.length)];
}

HexMaze.prototype.findMaxPos=function(fromId)
{
	//清空外加資訊
	let A=this.A;
	for(let i=0;i<A.length;++i) {
		A[i]&=63;
	}
	//設定邊界格
	(()=>{
		let offset=[this.n+1, this.n];
		let j=this.flag?0:1;
		let n=A.length;
		for(let i=0;i<n;) {
			A[i]|=128;
			i+=offset[j];
			j=(j+1)%2;
			if(i-1<n) {
				A[i-1]|=128;
			}
		}
		n=this.n;
		j=A.length-1;
		for(let i=0;i<n;++i) {
			A[i]|=128;
			A[j-i]|=128;
		}
	})();
	let idStack=[fromId], dirStack=[0], k=0;
	let maxDis=0, bestId=[fromId];
	A[fromId]|=64;
	while(k>=0) {
		let id=idStack[k], d=dirStack[k], x=A[id];
		//判斷是否為邊界且長度更長，是的話記錄下來
		if(d===0 && (x&128)) {
			if(k>maxDis) {
				bestId=[id];
				maxDis=k;
			} else if(k==maxDis) {
				bestId.push(id);
			}
		}
		//掃描最先遇到可走的
		let nearId;
		for(;d<6;++d) {
			if((x>>>d&1)!==1) {
				nearId=this.GetNearInfo(id, d);
				if(nearId!==-1 && !(A[nearId]&64)) {
					break;
				}
			}
		}
		//找不到可走的 d 就退出
		if(d>5) {
			--k;
			continue;
		}
		
		dirStack[k++]=d+1; //下次回這格從 d+1 開始找
		idStack[k]=nearId;
		dirStack[k]=0;
		A[nearId]|=64;
	}
	return bestId[Math.floor(Math.random()*bestId.length)];
}

HexMaze.prototype.Show_svg=function(r,with_sol)
{
	let getSvgPathData=(points)=>{
		const mMask=this.MOVE_MASK;
		const cMask=this.CURVE_MASK;
		const zMask=this.CLOSE_MASK;
		const vMask=this.VALUE_MASK;
		let s='', n=points.length, status=false;
		for(let i=0;i<n;++i) {
			let x=points.x[i];
			let y=points.y[i];
			if(x&mMask) {
				s+=`M ${(x&vMask)},${y} `;
				status='M';
			} else if(x&cMask) {
				s+=`Q ${(x&vMask)},${y} `;
				++i;
				x=points.x[i];
				y=points.y[i];
				s+=`${(x&vMask)},${y} `;
				status='Q';
			} else if(x&zMask) {
				s+='Z ';
				status='Z';
			} else {
				s+=`${status!=='L'?'L':''} ${(x&vMask)},${y} `;
				status='L';
			}
		}
		return s;
	}
	let p=this.getPaths();
	let radio=r/1000;
	//迷宮
	let s='';
	p.maze.forEach((points)=>{
		s+=getSvgPathData(points);
	});
	let svgStr=[`<svg width="${p.xMax*radio+2}" height="${p.yMax*radio+2}" viewBox="-0.5 -0.5 ${p.xMax*radio+2} ${p.yMax*radio+2}">`];
	svgStr.push(`<g transform="matrix(${radio} 0 0 ${radio} 0 0)">`);
	svgStr.push(`<path style="stroke:black;stroke-width:${1/radio}px;fill:none" d="${s}"/>`);
	s=getSvgPathData(p.solution);
	svgStr.push(`<path style="stroke:${with_sol?'red':'none'};stroke-width:${2/radio}px;fill:none" d="${s}"/>`);
	s=getSvgPathData(p.arrow);
	svgStr.push(`<path style="stroke:none;fill:gray" d="${s}"/>`);
	svgStr.push('</g>');
	svgStr.push('</svg>');
	return svgStr.join('\n');
}

HexMaze.prototype.MOVE_MASK=1<<30;
HexMaze.prototype.CURVE_MASK=1<<29;
HexMaze.prototype.CLOSE_MASK=1<<28;
HexMaze.prototype.VALUE_MASK=0xFFFFFFF;

HexMaze.prototype.getPaths=function()
{
	if(this.pathCache) {
		return this.pathCache;
	}
	const moveMask=this.MOVE_MASK;
	const curveMask=this.CURVE_MASK;
	const closeMask=this.CLOSE_MASK;
	let sol=this.GetSolution(this.start, this.final);
	let m=this.m, n=this.n, A=this.A, f=this.flag?1:0;
	let offset=f?0:n;
	let arr=[], x, y;
	//挖空起始點與終點的牆壁
	let startDir, endDir;
	(()=>{
		let d1=[],d2=[];
		for(let i=0;i<6;++i) {
			if(this.GetNearInfo(this.start, i)<0) {
				d1.push(i);
			}
			if(this.GetNearInfo(this.final, i)<0) {
				d2.push(i);
			}
		}
		startDir=d1[Math.floor(Math.random()*d1.length)];
		endDir=d2[Math.floor(Math.random()*d2.length)];
		A[this.start]&= (~(1<<startDir));
		A[this.final]&= (~(1<<endDir));
	})();
	if(f===0) {
		//處理第一列，只處理 bit 0, 3
		let pObj=newPointObject();
		addPoint(pObj, x=866, y=500, 0);
		for(let cIdx=0;cIdx<n;++cIdx) {
			let cellVal=A[cIdx]&63;
			addPoint(pObj, x+=866, y+=-500, cellVal>>>3&1);
			addPoint(pObj, x+=866, y+=500, cellVal&1);
		}
		stripMove(pObj);
		arr.push(pObj);
	}
	x=0;
	y=(f===0?2000:500);
	for(let rIdx=f?0:1;rIdx<m;rIdx+=2) {
		let p1Obj=newPointObject(),p2Obj=newPointObject();
		addPoint(p1Obj, x, y, 0);
		addPoint(p2Obj, x, y+1000, 0);
		for(let cIdx=0;cIdx<=n;++cIdx) {
			let cellVal=A[offset+cIdx]&63;
			x+=866;
			y+=-500;
			addPoint(p1Obj, x, y, cellVal>>>3&1);
			addPoint(p2Obj, x, y+2000, cellVal>>>5&1);
			x+=866;
			y+=500;
			addPoint(p1Obj, x, y, cellVal&1);
			addPoint(p2Obj, x, y+1000, cellVal>>>2&1);
		}
		offset+=(this.n<<1|1);
		x=0;
		y+=3000;
		stripMove(p1Obj);
		stripMove(p2Obj);
		arr.push(p1Obj);
		arr.push(p2Obj);
	}
	if(f+m&1) {
		//處理最末列，只處理 bit 2,5
		offset-=n;
		let pObj=newPointObject();
		addPoint(pObj, x=866, y-=500, 0);
		for(let cIdx=0;cIdx<n;++cIdx) {
			let cellVal=A[offset+cIdx]&63;
			addPoint(pObj, x+=866, y+=500, cellVal>>>5&1);
			addPoint(pObj, x+=866, y-=500, cellVal>>>2&1);
		}
		stripMove(pObj);
		arr.push(pObj);
	}
	//處理直線
	let pObj=newPointObject();
	let nc=f;
	let colCount=0;
	y=-1000;
	A.forEach((cellVal)=>{
		if(--colCount<=0) {
			x=nc?0:866;
			y+=1500;
			colCount=n+nc;
			nc=(nc+1&1);
			addPoint(pObj, x, y, 0);
			addPoint(pObj, x, y+1000, cellVal>>>4&1);
		} else {
			x+=1732;
		}
		addPoint(pObj, x+1732, y, 0);
		addPoint(pObj, x+1732, y+1000, cellVal>>>1&1);
	});
	stripMove(pObj);
	arr.push(pObj);
	//解答
	const startPosition=this.ConvToMN(this.start);
	const xOffset=[433, 866, 433, -433, -866, -433];
	const yOffset=[-750, 0, 750, -750, 0, 750];
	pObj=newPointObject();
	x=(((this.flag?1:0)+startPosition.m&1)?866:1732)+1732*startPosition.n;
	y=1000+1500*startPosition.m;
	addPoint(pObj, x, y, 0);
	for(let i=0;i<sol.length;++i) {
		let d=sol[i].d;
		if(d<0) {
			break;
		}
		addPoint(pObj, x+=xOffset[d], y+=yOffset[d], 1);
		let cFlag=i+2<sol.length?(sol[i+1].d!==d?2:1):1;
		addPoint(pObj, x+=xOffset[d], y+=yOffset[d], cFlag);
	}
	stripMove(pObj);
	//畫箭頭
	let pObj2=newPointObject();
	function drawArrow(position, dir, flag, rev){
		let x=(((flag?1:0)+position.m&1)?866:1732)+1732*position.n,
			y=1000+1500*position.m,
			d=rev?5-dir:dir;
		if(rev) {
			const xOffset=[433, 866, 433, -433, -866, -433];
			const yOffset=[-750, 0, 750, -750, 0, 750];
			x+=xOffset[dir];
			y+=yOffset[dir];
		}
		let xPosList, yPosList;
		if(d===1 || d===4) {
			xPosList=[519.6, 519.6, 866, 866, 519.6, 519.6];
			yPosList=[-300, -100, -100, 100, 100, 300];
		} else {
			xPosList=[519.6, 364.4, 519.6, 346.4, 173.2, 0];
			yPosList=[-300, -400, -700, -800, -500, -600];
		}
		let rx=d<3?1:-1;
		let ry=(d===2||d===5)?-1:1;
		addPoint(pObj2, x, y, 0);
		for(let i=0;i<6;++i) {
			addPoint(pObj2, x+xPosList[i]*rx, y+yPosList[i]*ry, 1);
		}
		addPoint(pObj2, x|closeMask, y, 1);
		stripMove(pObj2);
	}
	drawArrow(startPosition, startDir, this.flag, false);
	drawArrow(this.ConvToMN(this.final), endDir, this.flag, true);
	this.pathCache={
		maze: arr,
		arrow: pObj2,
		solution: pObj,
		xMin: 0,
		yMin: 0,
		xMax: 1732*(n+1),
		yMax: 500+1500*m
	};
	return this.pathCache;

	function newPointObject() {
		return {
			x:[],
			y:[],
			moveFlag: false,
			curveStatus: 0
		}
	}

	function addPoint(pointsObj, x, y, flag) {
		if(flag===0) { //moveTo
			if(pointsObj.moveFlag) {
				let idx=pointsObj.x.length-1;
				pointsObj.x[idx]=(x|moveMask);
				pointsObj.y[idx]=y;
			} else {
				pointsObj.moveFlag=true;
				pointsObj.x.push(x|moveMask);
				pointsObj.y.push(y);
			}
		} else if(flag===1) { //lineTo
			let idx=pointsObj.x.length-1;
			if(//如果成1直線，直接延長
				idx>0 &&
				!(pointsObj.x[idx]&(moveMask|curveMask)) &&
				!(pointsObj.x[idx-1]&curveMask) &&
				(pointsObj.x[idx]-pointsObj.x[idx-1])*(pointsObj.y[idx]-y)===(pointsObj.y[idx]-pointsObj.y[idx-1])*(pointsObj.x[idx]-x)
			) {
				pointsObj.x[idx]=x;
				pointsObj.y[idx]=y;
			} else {
				pointsObj.x.push(x);
				pointsObj.y.push(y);
			}
			if(pointsObj.moveFlag) {
				pointsObj.moveFlag=false;
			}
		} else if(flag===2) { //curveTo
			pointsObj.x.push(x|curveMask);
			pointsObj.y.push(y);
		}
	}
	
	function stripMove(pointsObj) {
		pointsObj.length=pointsObj.x.length;
		delete pointsObj.moveFlag;
	}
}

HexMaze.prototype.GetSolution=function(idi,idf)
{
	for(var i=0,L=this.A.length;i<L;++i) {
		this.A[i]&=63;
	}
	var stack=[{i:idi,d:0}];
	var lidx, cur_i, cur_d,t;
	this.A[idi]|=(1<<6);
	for(lidx=stack.length-1;lidx>=0 && stack[lidx].i!=idf;lidx=stack.length-1)
	{
		if(stack[lidx].d>=6)
		{
			this.A[stack[lidx].i]|=(1<<7);
			stack.pop();
			continue;
		}
		t=this.GetNearInfo(cur_i=stack[lidx].i,cur_d=stack[lidx].d);
		stack[lidx].d+=1;
		if(t!=-1 && !(this.A[stack[lidx].i]&(1<<cur_d)) && !(this.A[t]>>6))
		{
			stack.push({i:t,d:0});
			this.A[t]|=(1<<6);
		}
	}
	for(var i=0;i<stack.length;++i) {
		stack[i].d-=1;
	}
	return stack;
}

HexMaze.prototype.setWallThickness=function(wallThickness) {
	this.wallThickness = wallThickness;
}
/**
 * 位置是否可通行
 */
HexMaze.prototype.enableStand=function(x, y) {
	x -= (this.flag ? 866 : 1732);
	y -= 1000;
	let n = Math.floor(x / 1732 - y / 3000);
	let m = Math.floor(y / 1500);
	let result = {
		n: null,
		m: null,
		d: 99999999
	};
	function updateResult(n, m, r) {
		//n+= (m + (this.flag ? 0 : 1) >> 1);
		let dx = 1732 * n + 866 * m - x;
		let dy = 1500 * m - y;
		let d = dx * dx + dy * dy;
		if(d < r.d) {
			r.m = m;
			r.n = n;
			r.d = d;
		}
	}
	updateResult(n, m, result);
	updateResult(n, m+1, result);
	updateResult(n+1, m, result);
	updateResult(n+1, m+1, result);
	//修正後，(m, n) 是 maze 的mn, result 的是斜角坐標系的座標值
	n = result.n + (result.m + (this.flag ? 0 : 1) >> 1);
	m = result.m;
	let idx = this.ConvToIndex(m, n);
	if(idx < 0) {
		return false;
	}
	//相對此格中心點座標
	x -= 1732 * result.n + 866 * result.m;
	y -= 1500 * result.m;
	let dis = 866 - this.wallThickness;
	let d1 = (500 * x + 866 * y)/1000;
	let d2 = (500 * x - 866 * y)/1000;
	let cell = this.A[idx];
	if(
		((cell&1) && d2>dis) ||
		((cell&2) && x>dis) ||
		((cell&4) && d1>dis) ||
		((cell&8) && d1<-dis) ||
		((cell&16) && x<-dis) ||
		((cell&32) && d2<-dis)
	) {
		return false;
	}
	//判斷牆壁末端的點
	let nRight = n + ((this.flag?0:1) + m & 1);
	let dW = this.wallThickness * this.wallThickness;
	const offsets = [
		{dir: 0, x: 0, y:1000, c: 4, l: 1},
		{dir: 1, x: -866, y:500, c: 3, l: 2},
		{dir: 2, x: -866, y:-500, c: 0, l: 5},
		{dir: 5, x: 0, y:-1000, c: 1, l: 4},
		{dir: 4, x: 866, y:-500, c: 2, l: 3},
		{dir: 3, x: 866, y:500, c: 5, l: 0}
	];
	let nearCells = [
		this.ConvToIndex(m-1, nRight),
		this.ConvToIndex(m, n+1),
		this.ConvToIndex(m+1, nRight),
		this.ConvToIndex(m+1, nRight-1),
		this.ConvToIndex(m, n-1),
		this.ConvToIndex(m-1, nRight-1),
	].map(idx=>(idx>0 ? this.A[idx] : false));
	for(let i=0; i<6; ++i) {
		let curWallExists = (cell & 1 << offsets[i].dir);
		let lastWallExists = (cell & 1 << offsets[(i+5)%6].dir);
		if(!curWallExists && !lastWallExists) {
			let o = offsets[i];
			let j = (i+5)%6;
			if(
				(nearCells[i] && (nearCells[i] & 1 << o.c)) ||
				(nearCells[j] && (nearCells[j] & 1 << o.l))
			) {
				let dx = x + o.x;
				let dy = y + o.y;
				if(dx*dx+dy*dy<dW) {
					return false;
				}
			}
		}
	}
	return true;
}

HexMaze.prototype.getXY=function(m, n) {
	if(n===undefined) {
		let o = this.ConvToMN(m);
		m = o.m;
		n = o.n - (m + (this.flag ? 0 : 1) >> 1);
	}
	let x = (this.flag ? 866 : 1732) + 1732 * n + 866 * m;
	let y = 1000 + 1500 * m;
	return [x, y];
}

try{
	module.exports=HexMaze;
} catch {

}