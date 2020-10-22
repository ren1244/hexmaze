const HexMaze=require('./hexmaze.js');
import 'jquery';
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

$(()=>{
    $('#solution').on('change', sol_selec_change);
    $('#run').on('click', run);
    run();
});
function run()
{
	let w=parseInt(document .getElementById("width").value, 10);
	let h=parseInt(document .getElementById("height").value, 10);
	let d=parseFloat(document .getElementById("De").value);
	let step=parseInt(document .getElementById("step").value);
	let sol=document .getElementById("solution").checked;
	let maze=new HexMaze(h,w,true,step);
	document .getElementById("SVG_DIV").innerHTML=maze.Show_svg(d,sol);
}

function sol_selec_change()
{
	var str=document .getElementById("SVG_DIV").innerHTML;
	var sol=document .getElementById("solution").checked;
	if(sol){
        str=str.replace(/stroke:none/g,"stroke:red");
    }
	else {
        str=str.replace(/stroke:red/g,"stroke:none");
    }
	document .getElementById("SVG_DIV").innerHTML=str;
}
