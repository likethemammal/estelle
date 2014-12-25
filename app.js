var jsonCallbackFunc;
var prefixes = ['-webkit-', '-moz-', '-o-', ''];
var Player;
var View;
var Model;

Player = {
    onPlayClick: function(ev) {
        var el = ev.currentTarget;
        var elIndex = el.id.split('play-')[1];
        var audio = document.getElementById('song-' + elIndex);
        var durationEl = document.getElementById('duration-' + elIndex);
        var styleSheet = document.getElementById('duration-styles');

        // Audio tag needs to be set to preload to be able to read from audio.duration
        audio.preload = 'auto';

        var totalDuration = audio.duration;
        var currentDuration = audio.currentTime;
        var percentComplete = currentDuration/totalDuration || 0;

        if (audio.paused) {
            this.resetAllPlayBtns(styleSheet);

            this.setTransition(styleSheet, elIndex, durationEl, currentDuration, totalDuration);

            el.classList.add('playing');
            el.classList.remove('paused');

            audio.play();
        } else {
            this.setPause(el);
            this.stopDuration(styleSheet, durationEl, percentComplete);

            audio.pause();
        }
    },

    setTransition: function(styleSheet, elIndex, durationEl, currentDuration, totalDuration) {
        var remainingDuration = totalDuration - currentDuration || 0;

        if (transitionSupport) {
            var stylesStr = '';

            stylesStr += '#duration-' + elIndex + '{';

            for (var i = 0; i < prefixes.length; i++) {
                stylesStr += prefixes[i] + 'transition: width ' + Math.floor(remainingDuration) + 's linear;';
            }

            stylesStr += '}';
            styleSheet.innerHTML = stylesStr;
            durationEl.style['width'] = '100%';
        } else {

            // Clear timeout because sometimes song ending doesnt match up with end of timeout
            clearTimeout(this.durationTimeout || '');

            var precision = 2;
            var numRemaining = remainingDuration * precision;
            var remainingDelta = 0;
            var widthPercentIncrement = (100/totalDuration) / precision;
            var currentWidth = parseFloat(durationEl.style['width']) || 0;

            var onDurationTick = function () {

                remainingDelta++;
                durationEl.style['width'] = (currentWidth + widthPercentIncrement * remainingDelta) + '%';

                if (remainingDelta > numRemaining) {
                    clearTimeout(this.durationTimeout);
                    return false;
                } else {
                    this.durationTimeout = setTimeout(onDurationTick, 1000 / precision);
                }
            }.bind(this);

            this.durationTimeout = setTimeout(onDurationTick, 1000 / precision);
        }
    },

    stopDuration: function(styleSheet, durationEl, percentComplete) {
        if (transitionSupport) {
            styleSheet.innerHTML = '';
        } else {
            clearTimeout(this.durationTimeout);
        }
        durationEl.style['width'] = Math.floor(percentComplete * 100) + '%';
    },

    setPause: function(el) {
        el.classList.add('paused');
        el.classList.remove('playing');
    },

    resetAllPlayBtns: function(styleSheet) {
        var audioTags = document.getElementsByClassName('song');

        for (var j = 0; j < audioTags.length; j++) {
            var indexedAudio = audioTags[j];
            var indexedPlayBtn = document.getElementById('play-' + j);

            if (!indexedAudio.paused) {
                var indexedDuration = document.getElementById('duration-' + j);
                var indexedCurrentDuration = indexedAudio.currentTime;
                var indexedPercentComplete = indexedCurrentDuration/indexedAudio.duration;

                indexedAudio.pause();
                this.stopDuration(styleSheet, indexedDuration, indexedPercentComplete);
            }

            this.setPause(indexedPlayBtn)

        }
    },

    onTrackEnded: function(ev) {
        var el = ev.currentTarget;
        var elIndex = parseInt(el.id.split('song-')[1], 10);
        var nextPlayIndex = elIndex + 1;
        var nextPlayEl = document.getElementById('play-' + nextPlayIndex);

        if (nextPlayEl) {
            nextPlayEl.click();
        } else {
            var firstPlayEL = document.getElementById('play-0');

            firstPlayEL.click();
        }
    }
};

View = {

    facebookMaxNum: 8,
    soundcloudMaxNum: 8,

    onFacebookData: function(data) {
        var feedData = data.responseData.feed;
        var entries = feedData.entries;
        var docFragment = document.createDocumentFragment();
        var facebookEl = document.querySelector('#facebook-section .section-content');
        var months = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];
        var entriesLength = Math.min(entries.length, this.facebookMaxNum);

        for (var i = 0; i < entriesLength; i++) {
            var entry = entries[i];

            if (!entry.contentSnippet) {
                continue;
            }

            var date = new Date(entry.publishedDate);
            var entryEl = document.createElement('div');
            var entryLink = document.createElement('a');
            var dateEl = document.createElement('div');
            var contentEl = document.createElement('div');
            var viewMoreEl = document.createElement('div');
            var viewMoreLink = document.createElement('a');
            var linkTitle = 'View this full post';

            var day = date.getDate();
            var month = date.getMonth();
            var year = date.getFullYear() + '';

            year = "'" + year.substring(year.length - 2, year.length);

            date = day + " " + months[month] + " " + year;

            entryEl.classList.add('entry');
            entryLink.classList.add('entry-link');
            dateEl.classList.add('entry-date');
            contentEl.classList.add('entry-content');
            viewMoreEl.classList.add('entry-view-more');

            dateEl.textContent = date;
            viewMoreLink.textContent = 'View';

            entryLink.href = entry.link;
            viewMoreLink.href = entry.link;

            entryLink.title = linkTitle;
            viewMoreLink.title = linkTitle;

            contentEl.innerHTML = entry.contentSnippet;

            viewMoreEl.appendChild(viewMoreLink);

            entryEl.appendChild(dateEl);
            entryEl.appendChild(contentEl);
            entryEl.appendChild(viewMoreEl);
            entryLink.appendChild(entryEl);


            docFragment.appendChild(entryLink);
        }

        facebookEl.appendChild(docFragment);

        this.onFacebookLoaded();
    },

    onFacebookLoaded: function() {
        var header = document.querySelector('#facebook-section .section-header');
        var section = document.querySelector('#facebook-section');
        var content = document.querySelector('#facebook-section .section-content');

        content.style.height = 'auto';
        content.style.opacity = 1;

        section.classList.remove('square');
    },

    onSoundcloudData: function(tracks) {
        var soundcloudEl = document.querySelector('#soundcloud-section .section-content');
        var trackDurations = [];
        this.tracksLength = Math.min(tracks.length, this.soundcloudMaxNum);
        this.elsLoaded = 0;
        this.totalLoading = 0;
        this.setProfileImage(tracks[0].user.avatar_url);

        for (var i = 0; i < this.tracksLength; i++) {
            var track = tracks[i];
            var duration = track.duration;

            //Skip this track because its already been loaded, sometimes Soundcloud returns multiples.
            if (trackDurations.indexOf(duration) > 0) {
                tracks.splice(i, 1);
                track = tracks[i];
                duration = track.duration;
            } else {
                trackDurations.push(duration);
            }

            var waveformSrc = track.waveform_url;
            var streamingURL = track.stream_url + '?client_id=' + clientID;

            var trackContainer = document.createElement('div');
            var trackHeader = document.createElement('div');
            var trackLink = document.createElement('a');
            var trackLinkImg = document.createElement('img');
            var trackTitle = document.createElement('div');
            var trackDuration = document.createElement('div');
            var albumContainer = document.createElement('div');
            var albumImg = document.createElement('img');
            var songContainer = document.createElement('div');
            var durationEl = document.createElement('div');
            var waveformEl = document.createElement('img');
            var playBtnContainer = document.createElement('div');
            var playBtn = document.createElement('div');
            var playImg = document.createElement('img');
            var pauseImg = document.createElement('img');
            var audioEl = document.createElement('audio');

            trackLink.classList.add('track-link');
            trackLinkImg.classList.add('track-link-img');
            trackTitle.classList.add('track-title');
            trackDuration.classList.add('track-duration');
            albumImg.classList.add('album-img');
            albumContainer.classList.add('album-container');
            songContainer.classList.add('song-container');
            playBtnContainer.classList.add('play-btn-container');
            waveformEl.classList.add('waveform');
            durationEl.classList.add('duration');
            audioEl.classList.add('song');


            trackContainer.className = 'track-container cf';
            trackHeader.className = 'track-header cf';
            playImg.className = 'play-btn-image play-img';
            pauseImg.className = 'play-btn-image pause-img';
            playBtn.className = 'play-btn paused';

            trackLinkImg.src = 'imgs/icons/soundcloud-icon.png';
            waveformEl.src = waveformSrc;
            playImg.src = 'imgs/audio_play.svg';
            pauseImg.src = 'imgs/audio_stop.svg';
            audioEl.src = streamingURL;

            audioEl.preload = 'auto';

            if (track.artwork_url) {
                albumImg.src = track.artwork_url;
                this.listenToLoad(albumImg);
            }
            this.listenToLoad(waveformEl);

            durationEl.id = 'duration-' + i;
            playBtn.id = 'play-' + i;
            audioEl.id = 'song-' + i;

            trackTitle.textContent = track.title;
            trackLink.href = track.permalink_url;

            trackLinkImg.alt = 'Soundcloud Logo';
            trackLink.title = 'Listen on Soundcloud';

            var date = new Date(duration);
            var seconds = date.getSeconds();

            if (seconds < 10) {
                seconds = '0' + seconds;
            }

            trackDuration.textContent = date.getMinutes() + ':' + seconds;

            playBtn.onclick = Player.onPlayClick.bind(Player);
            audioEl.onended = Player.onTrackEnded.bind(Player);

            playBtn.appendChild(playImg);
            playBtn.appendChild(pauseImg);
            playBtnContainer.appendChild(playBtn);
            songContainer.appendChild(durationEl);
            songContainer.appendChild(waveformEl);
            songContainer.appendChild(audioEl);
            albumContainer.appendChild(playBtnContainer);
            albumContainer.appendChild(albumImg);
            trackLink.appendChild(trackLinkImg);
            trackHeader.appendChild(trackLink);
            trackHeader.appendChild(trackTitle);
            trackHeader.appendChild(trackDuration);
            trackContainer.appendChild(trackHeader);
            trackContainer.appendChild(songContainer);
            trackContainer.appendChild(albumContainer);
            soundcloudEl.appendChild(trackContainer);
        }

    },

    listenToLoad: function(el) {
        el.onload = onElLoad.bind(this);
        this.totalLoading++;

        function onElLoad(ev) {
            this.elsLoaded++;

            if (this.elsLoaded >= this.totalLoading) {
                this.onSoundcloudLoaded();
            }
        }
    },

    onSoundcloudLoaded: function() {
        if (this.elsLoaded < this.totalLoading) {
            return false;
        }
        var header = document.querySelector('#soundcloud-section .section-header');
        var section = document.querySelector('#soundcloud-section');
        var content = document.querySelector('#soundcloud-section .section-content');

        content.style.height = 'auto';
        content.style.opacity = 1;

        section.classList.remove('square');
        header.classList.add('soundcloud-colors');
    },

    setProfileImage: function(imageSrc) {
        var imageEl = document.getElementById('tagline-img');

        imageEl.src = imageSrc;
    }
};

Model = {

    googleFeedGetterLink: 'http://ajax.googleapis.com/ajax/services/feed/load?v=2.0',
    maxNumEntries: 50,
    facebookFeedLink: 'https://www.facebook.com/feeds/page.php?id=96726108616&format=rss20',

    init: function() {
        this.getFacebookFeed();
        this.getSoundcloudFeed();
    },

    getRSSFeedData: function(feedLink, feedID) {
        var feedLinkOption = '&q=' + encodeURIComponent(feedLink);
        var numExtriesOption = '&num=' + this.maxNumEntries;
        var callbackOption = '&callback=jsonCallbackFunc';
        var scriptSource = this.googleFeedGetterLink + feedLinkOption + numExtriesOption + callbackOption;
        var script = document.getElementById(feedID + '-json');

        script.src = scriptSource;
    },

    getFacebookFeed: function() {
        var feedID = 'facebook';
        var script = document.createElement('script');
        var onFacebookData = this.onFeedData(View.onFacebookData, feedID);

        script.id = feedID + '-json';
        jsonCallbackFunc = onFacebookData;

        document.body.appendChild(script);
        this.getRSSFeedData(this.facebookFeedLink, feedID);
    },

    getSoundcloudFeed: function() {
        var userID = '24298775'; //Estelle's Username
        var fetchingURL = '/users/' + userID + '/tracks';
        var deferred = Q.defer();
        var promise = deferred.promise;

        SC.get(fetchingURL, function(tracks) {
            View.onSoundcloudData(tracks)

            if (deferred) {
                deferred.resolve();
            }
        }. bind(this));
    },

    onFeedData: function(onDataFunc, feedID) {
        var onFeedData = function(data) {
            var dataFunc = onDataFunc.bind(View);
            if (data.responseStatus === 200) {
                dataFunc(data);
            } else {
                console.warn('The "' + feedID + '" feed loading failed.')
            }
        };

        return onFeedData;
    }
};

Model.init();
