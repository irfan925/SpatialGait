//Global Variables
const canvas =  document.getElementById("pose-canvas");
const ctx = canvas.getContext("2d");
const video = document.getElementById("pose-video");
dis = document.getElementById('dis');
spd = document.getElementById('Gait Speed')

const pose = new Pose({locateFile: (file) => {
    //return `assets/${file}`;
    return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
}});

var flag = false, setflag = true;
var e = document.getElementById("dir");
////var txt = e.value;
function change(){
    txt = e.value;
    ///console.log(txt);
}

const k =15;

var dflag=false;
var results_cpy;
var min = 0, sec = 0;
var param = [], tm1 = 0;




const config ={
    ///video:{width:70, height:auto}
    video:{ width: 960, height: 540, fps: 30}
    //video:{ width: 480, height: 640, fps: 30}
    //video:{ width: 280, height: 440, fps: 30}
};


function toggleDistance(button)
{
    // To Toggle distance button between detect and pause

    if (dflag)
    {
        dflag = false;
        button.innerHTML= "Start"; 
    } 
    else 
    {
        dflag = true;
        timer()
        button.innerHTML= "Stop";     
    }
}


function resetParam(button)
{
     
    //window.location.reload();
    min = 0;
    sec = 0;
    document.getElementById('time').innerHTML=min+":"+sec;
    flag = false;
    e.value = "No";
    bezier_points = [];
    console.log(bezier_points);
}

function setParam(button)
{
    // To set the parameters.

    ///console.log(txt)

    if (flag)
    {
        flag = false;
        button.innerHTML= "Start"; 
    } 
    else 
    {
        if(txt === "No")
        {
            ///console.log("'select' check")
            alert("Please select a direction of walking");
        }
        else
        {
            flag = true;
            timer()
            button.innerHTML= "Stop"; 
        }
           
    }
}

function timer()
{
     // Timer Function, Starts when video starts playing-> This fn has changed.

     var time = setInterval(function(){

        if(!flag){
            clearInterval(time)
        }
        
    	document.getElementById('time').innerHTML=min+":"+sec;
        sec++;

        if(sec == 60)
        {
            sec=0;
            min++;
        }
        
    }, 1000);
}
/*
function toggleStrideLength(button){

// To toggle stride length button between Detect and pause
// Activates only when both right and left step length is in detect mode

    if (strideflag) {

        strideflag = false;
        button.innerHTML= "Detect"; 
    } 
    else {

            strideflag = true;
            button.innerHTML= "Pause"; 
    }
}*/

function distance(x1,y1,x2,y2){

    // calculate eucliedean distance between point(x1,y1) and (x2,y2)

    let a = x2-x1;
    let b = y2-y1;
    let result = Math.sqrt( a*a + b*b);

    return result;
}

function download_csv(){
    //define the heading for each row of the data
    var csv = 'time(in ms), frame_duration(in ms), time(in s), stepL, abs_stepL, shoulderL.x, shoulderL.y, shoulderL.z, shoulderR.x, shoulderR.y, shoulderR.z, hipL.x, hipL.y, hipL.z, hipR.x, hipR.y, hipR.z, kneeL.x, kneeL.y, kneeL.z, kneeR.x, kneeR.y, kneeR.z, ankleL.x, ankleL.y, ankleL.z, ankleR.x, ankleR.y, ankleR.z, heelL.x, heelL.y, heelL.z, heelR.x, heelR.y, heelR.z, footIndexL.x, footIndexL.y, footIndexL.z, footIndexR.x, footIndexR.y, footIndexR.z\n';
    
    //merge the data with CSV
    bezier_points.forEach(function(row) {
            csv += row.join(',');
            csv += "\n";
    });
 

   
    var hiddenElement = document.createElement('a');
    hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
    hiddenElement.target = '_blank';
    
    //provide the name for the CSV file to be downloaded
    hiddenElement.download = 'gaitData.csv';
    hiddenElement.click();
}



async function main()
{
    // Main function
    // Initialize required variables, load model, etc.
    const download = document.getElementById("dow");
    const setBttn = document.getElementById("bttn3");
    const resetBttn = document.getElementById("bttn4");
	const distanceBttn = document.getElementById("bttn8");
	
	
	distanceBttn.onclick = function(){
        video.play();
        toggleDistance(distanceBttn)
    }

    // setBttn.onclick = function(){
    //     setParam(setBttn)
    // }

    // resetBttn.onclick = function(){
    //     resetParam(setBttn)
    // }

    download.onclick = function(){
        download_csv()
    }

    pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: true,
        smoothSegmentation: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

    pose.onResults(onResults);
    
    //video.src ="http://192.168.43.82:4747/"       //  IP web cam

    //video.playbackRate = 0.2;                // video File
    video.width = config.video.width;
    video.height= config.video.height;

    canvas.width = config.video.width;
    canvas.height = config.video.height;


    video.onloadedmetadata = function(e) {
        video.play();
    };


    video.addEventListener("play",computeFrame);
}


function calculateAngle(x1,y1,x2,y2,x3,y3){  //Previously calculateHipAngle()
    //  Formula:   a^2 + b^2 - 2abCos(C) = c^2

    let a_sq = ((x2-x1)*(x2-x1)) + ((y2-y1)*(y2-y1));
    let b_sq = ((x3-x2)*(x3-x2)) + ((y3-y2)*(y3-y2));
    let c_sq = ((x3-x1)*(x3-x1)) + ((y3-y1)*(y3-y1));

    let value= (a_sq + b_sq - c_sq)/(2* Math.sqrt(a_sq)* Math.sqrt(b_sq) )
    let angle_rad = Math.acos(value)
    let angle = angle_rad *(180.0 / Math.PI)

    return angle // May be changed to (180 - angle)
}


function convTime(tim)
{
    tim /= 1000
    if(tim<0)
    {
        tim += 1
    }

    return tim
}

function onResults(results)
{
    // draw image frame,skeleton points
    // calculate right & left joint angles and display it

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    //console.log(results)


    if(results.poseWorldLandmarks)
    {

        results_cpy=results;
        ////console.log(results.poseWorldLandmarks)
        let shoulderL = results.poseWorldLandmarks[11]
        let shoulderR = results.poseWorldLandmarks[12]
        let hipL = results.poseWorldLandmarks[23]
        let hipR = results.poseWorldLandmarks[24]
        let kneeL = results.poseWorldLandmarks[25]
        let kneeR = results.poseWorldLandmarks[26]
        let ankleL = results.poseWorldLandmarks[27]
        let ankleR = results.poseWorldLandmarks[28]
        let heelL = results.poseWorldLandmarks[29]
        let heelR = results.poseWorldLandmarks[30]
        let foot_indexR = results.poseWorldLandmarks[32];
        let foot_indexL = results.poseWorldLandmarks[31];

        //console.log(eyeL.y-heelL.y)   ///Height
        let stepLen =0;
        if(dflag){
            stepLen = heelL.x - heelR.x
            //console.log(stepLen)
        }
        
        if(dflag){
            var tm = new Date();
            var data = [];
            var dis = Math.abs(ankleL.x - ankleR.x)
            var tim = convTime(tm.getMilliseconds() - tm1)
            document.getElementById("dur").innerHTML = tim.toFixed(3)
            var velo = (dis/tim)/4
            document.getElementById("Gait Speed").innerHTML = velo.toFixed(2)
            console.log(dis, velo)

            data.push(tm.getMilliseconds());
            data.push(tm.getMilliseconds() - tm1);
            data.push(tm.getSeconds());
            data.push(ankleL.x - ankleR.x)
            data.push(Math.abs(ankleL.x - ankleR.x))
            //console.log(Math.abs(ankleL.x - ankleR.x))
            document.getElementById("dis").innerHTML = (dis*100).toFixed(1)
            //document.getElementById("Gait Speed").innerHTML = velo
            data.push(shoulderL.x)
            data.push(shoulderL.y)
            data.push(shoulderL.z)
            data.push(shoulderR.x)
            data.push(shoulderR.y)
            data.push(shoulderR.z)
            data.push(hipL.x)
            data.push(hipL.y)
            data.push(hipL.z)
            data.push(hipR.x)
            data.push(hipR.y)
            data.push(hipR.z)
            data.push(kneeL.x)
            data.push(kneeL.y)
            data.push(kneeL.z)
            data.push(kneeR.x)
            data.push(kneeR.y)
            data.push(kneeR.z)
            data.push(ankleL.x)
            data.push(ankleL.y)
            data.push(ankleL.z)
            data.push(ankleR.x)
            data.push(ankleR.y)
            data.push(ankleR.z)
            data.push(heelL.x)
            data.push(heelL.y)
            data.push(heelL.z)
            data.push(heelR.x)
            data.push(heelR.y)
            data.push(heelR.z)
            data.push(foot_indexL.x)
            data.push(foot_indexL.y)
            data.push(foot_indexL.z)
            data.push(foot_indexR.x)
            data.push(foot_indexR.y)
            data.push(foot_indexR.z)
           
            param.push(data);     //To store whole row in the param array.   
            tm1 = tm.getMilliseconds()

        }
		
	}
	// time_diff = performance.now() - fps_start_time
            
    // if(time_diff ==0)
    //     fps =0
    // else
    //     fps = 1/ time_diff
                
    // fps_text = "FPS:"+(fps).toFixed(2)
    // ctx.font = "20px Comic Sans MS";
    // ctx.fillStyle = "red";
    // ctx.fillText(fps_text, 10, 40);

    drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS,{color: '#00FF00', lineWidth: 4});
    drawLandmarks(ctx, results.poseLandmarks,{color: '#FF0000', lineWidth: 1});


}


async function computeFrame()
{
    
    await pose.send({image: video});
    //requestAnimationFrame(computeFrame);
    setTimeout(computeFrame, 1000 / 10);
}


async function init_camera_canvas()
{
    const constraints ={
        audio: false,
        video:{
        width: config.video.width,           
        height: config.video.height,
        facingMode: 'environment',
        frameRate: { max: config.video.fps }
        }
    };
    
    video.width = config.video.width;     
    video.height= config.video.height;

    canvas.width = config.video.width;
    canvas.height = config.video.height;
    console.log("Canvas initialized");

    navigator.mediaDevices.getUserMedia(constraints).then(stream => {
        video.srcObject = stream;
        main();
    });

}

document.addEventListener("DOMContentLoaded",function(){
    init_camera_canvas();
});
