'use strict'
import MediaStreamView from './MediaStreamView';

/**
 * Draws a view representing a peer
 */
export const MeStreamView = ({
  me,
}) => (
  <div style="width:80%; height:100%;">
		<span>Your name: {me.name}</span>
		<MediaStreamView stream={me ? me.stream : null}/>
	</div>
);

export default MeStreamView
