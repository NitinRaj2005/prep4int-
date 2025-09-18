const x = document.getElementsByClassName("button");//querySelector me '.button' karte hai isme directly
for(var i=0; i<x.length; i++){
  x[i].style.backgroundColor='rgb(242, 229, 210)';
  x[i].style.borderStyle='outset';
}

const send= document.querySelector('.submit-button');
send.style.backgroundColor='#F44770';

send.addEventListener('mouseover', ()=>{
  send.style.backgroundColor='#a167ed';
  send.style.transition='.2s ease';
})
send.addEventListener('mouseout', ()=>{
  send.style.backgroundColor='#F44770';
  send.style.transition='.2s ease';
})

// but1.addEventListener('mouseover', ()=>{
//   but1.style.backgroundColor='rgb(131, 245, 144)';
//   // but1.style.boxShadow='0 0 40px #a167ed';
//   but1.style.transition='.2s ease';
  
// })
// but1.addEventListener('mouseout', ()=>{
//   but1.style.backgroundColor='cyan';
//   but1.style.boxShadow='0 0 40px white';
//   but1.style.transition='.2s ease';
// })



