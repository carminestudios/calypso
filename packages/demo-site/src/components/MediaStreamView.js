'use strict'

/**
 * Draws a video view
 */
export const MediaStreamView = ({
  stream,
}) => (
  <div style="width:100%; height:100%; background-color:#FF0000;">
    {stream ? <video src={URL.createObjectURL(stream)} autoplay style="width:100%; height: 100%;" /> : <div></div>}
  </div>
)

export default MediaStreamView
