'use strict'
import MediaStreamView from './MediaStreamView';

/**
 * Draws a view representing a peer
 */
export const PeerStreamView = ({
  peer,
}) => (
  <div style="width:200px; height:200px; background-color: #FF00FF; z-index:1000; float:right;">
		<span>{peer.name}</span>
		<MediaStreamView stream={peer.stream} />
	</div>
);

export default PeerStreamView
