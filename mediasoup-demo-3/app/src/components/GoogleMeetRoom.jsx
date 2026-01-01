import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import clipboardCopy from 'clipboard-copy';
import * as appPropTypes from './appPropTypes';
import { withRoomContext } from '../RoomContext';
import * as requestActions from '../redux/requestActions';
import { Appear } from './transitions';
import Peers from './Peers';
import Me from './Me';
import Notifications from './Notifications';
import '../scss/google-meet.scss';

class GoogleMeetRoom extends React.Component {
    state = {
        showParticipants: false,
        showChat: false,
    };

    render() {
        const {
            roomClient,
            room,
            me,
            amActiveSpeaker,
            onRoomLinkCopy,
        } = this.props;

        const { showParticipants, showChat } = this.state;

        // Extract room code from URL (last 6 characters or similar)
        const roomCode = room.url ? room.url.split('/').pop().substring(0, 6).toUpperCase() : '------';

        return (
            <Appear duration={300}>
                <div className="google-meet-container">
                    <Notifications />

                    {/* Top Bar */}
                    <div className="meet-header">
                        <div className="meet-info">
                            <div className="meet-logo">
                                <span className="logo-text">MindWave Meet</span>
                            </div>
                            <div className="meet-code">
                                <span className="code-label">Meeting code:</span>
                                <span className="code-value">{roomCode}</span>
                                <button
                                    className="copy-code-btn"
                                    onClick={() => {
                                        clipboardCopy(room.url).then(onRoomLinkCopy);
                                    }}
                                    title="Copy meeting link"
                                >
                                    📋
                                </button>
                            </div>
                        </div>
                        <div className="meet-status">
                            <div className={classnames('connection-indicator', room.state)}>
                                <span className="status-dot"></span>
                                <span className="status-text">{room.state}</span>
                            </div>
                        </div>
                    </div>

                    {/* Video Grid */}
                    <div className="meet-video-grid">
                        {/* Remote Participants */}
                        <Peers />

                        {/* Local Video (Me) */}
                        <div
                            className={classnames('video-tile local-video', {
                                'active-speaker': amActiveSpeaker,
                            })}
                        >
                            <Me />
                        </div>
                    </div>

                    {/* Control Bar */}
                    <div className="meet-controls">
                        <div className="controls-left">
                            <div className="meeting-time">
                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>

                        <div className="controls-center">
                            {/* Microphone */}
                            <button
                                className={classnames('control-btn', {
                                    'btn-danger': me.audioMuted || !me.canSendMic,
                                })}
                                onClick={() => {
                                    me.audioMuted
                                        ? roomClient.unmuteMic()
                                        : roomClient.muteMic();
                                }}
                                disabled={!me.canSendMic}
                                title={me.audioMuted ? 'Unmute' : 'Mute'}
                            >
                                <span className="btn-icon">{me.audioMuted ? '🔇' : '🎤'}</span>
                            </button>

                            {/* Camera */}
                            <button
                                className={classnames('control-btn', {
                                    'btn-danger': !me.webcamInProgress && me.webcamState !== 'on',
                                })}
                                onClick={() => {
                                    me.webcamState === 'on'
                                        ? roomClient.disableWebcam()
                                        : roomClient.enableWebcam();
                                }}
                                disabled={me.webcamInProgress}
                                title={me.webcamState === 'on' ? 'Turn off camera' : 'Turn on camera'}
                            >
                                <span className="btn-icon">{me.webcamState === 'on' ? '📹' : '📷'}</span>
                            </button>

                            {/* Screen Share */}
                            <button
                                className={classnames('control-btn', {
                                    'btn-active': me.shareInProgress || me.shareState === 'on',
                                })}
                                onClick={() => {
                                    me.shareState === 'on'
                                        ? roomClient.disableShare()
                                        : roomClient.enableShare();
                                }}
                                disabled={me.shareInProgress}
                                title={me.shareState === 'on' ? 'Stop sharing' : 'Share screen'}
                            >
                                <span className="btn-icon">🖥️</span>
                            </button>

                            {/* End Call */}
                            <button
                                className="control-btn btn-end-call"
                                onClick={() => {
                                    if (confirm('Leave meeting?')) {
                                        roomClient.close();
                                        window.location.href = '/';
                                    }
                                }}
                                title="Leave meeting"
                            >
                                <span className="btn-icon">📞</span>
                            </button>
                        </div>

                        <div className="controls-right">
                            {/* Participants */}
                            <button
                                className={classnames('control-btn-icon', {
                                    active: showParticipants,
                                })}
                                onClick={() => this.setState({ showParticipants: !showParticipants })}
                                title="Show participants"
                            >
                                <span className="btn-icon">👥</span>
                            </button>

                            {/* More Options */}
                            <button
                                className="control-btn-icon"
                                title="More options"
                            >
                                <span className="btn-icon">⋮</span>
                            </button>
                        </div>
                    </div>
                </div>
            </Appear>
        );
    }

    componentDidMount() {
        const { roomClient } = this.props;
        roomClient.join();
    }
}

GoogleMeetRoom.propTypes = {
    roomClient: PropTypes.any.isRequired,
    room: appPropTypes.Room.isRequired,
    me: appPropTypes.Me.isRequired,
    amActiveSpeaker: PropTypes.bool.isRequired,
    onRoomLinkCopy: PropTypes.func.isRequired,
};

const mapStateToProps = state => {
    return {
        room: state.room,
        me: state.me,
        amActiveSpeaker: state.me.id === state.room.activeSpeakerId,
    };
};

const mapDispatchToProps = dispatch => {
    return {
        onRoomLinkCopy: () => {
            dispatch(
                requestActions.notify({
                    text: 'Meeting link copied to clipboard!',
                })
            );
        },
    };
};

const GoogleMeetRoomContainer = withRoomContext(
    connect(mapStateToProps, mapDispatchToProps)(GoogleMeetRoom)
);

export default GoogleMeetRoomContainer;
