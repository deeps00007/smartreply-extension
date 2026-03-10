import React from "react"
import { createRoot } from "react-dom/client"

function Popup(){

  return(

    <div style={{width:250,padding:10}}>

      <h3>SmartReply AI</h3>

      <p>
        Click AI button inside textboxes
        to generate replies.
      </p>

    </div>

  )
}

createRoot(document.getElementById("root"))
.render(<Popup/>)