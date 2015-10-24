(function() {
  function Accordion(openers) {
    var mediaMatcher = (matchMedia) ? matchMedia('(max-width: 36em)') : null,
        sections = [];
    /*
    Sections of the accordion
    */
    function Section(opener) {
      this.opener = opener;
      this.clickHandler = function() {
        var newHeight = (this.isClosed) ? this.maxHeight : this.minHeight;
        this.parent.style.height = newHeight;
        this.parent.classList.toggle('collapsable');
      }.bind(this);
      mediaMatcher.addListener(this.change.bind(this));
      this.change(mediaMatcher);
    }

    Object.defineProperties(Section.prototype, {
        parent: {
          get: function() {
            return this.opener.parentElement;
          }
        },
        isClosed: {
          get: function() {
            return this.parent.classList.contains('collapsable');
          }
        },
        maxHeight: {
          get: function() {
            return this.parent.scrollHeight + 'px';
          }
        },
        minHeight: {
          get: function() {
            return this.opener.offsetHeight + 'px';
          }
      }
    });

    /**
    reactToMediaMatch
    **/
    Section.prototype.change = function(mqChange) {
      if (mqChange.matches) {
        this.opener.addEventListener('click', this.clickHandler);
        if (!this.isClosed) {
          this.parent.style.height = this.maxHeight;
        }
        return;
      }
      this.parent.style.height = '';
      this.opener.removeEventListener('click', this.clickHandler);
    };

    function openAccordion(openers) {
      openers.forEach(function(opener) {
        opener.parentElement.classList.remove('collapsable');
      });
    }

    //if we can't use the media matcher, then open the accordion and abort
    if (!mediaMatcher) {
      return openAccordion(openers);
    }

    //otherwise, set up the accordion
    for (var i = 0; i < openers.length; i++) {
      sections.push(new Section(openers[i], mediaMatcher));
    }
  }

  window.addEventListener('DOMContentLoaded', function() {
    var openers = document.querySelectorAll('.collapsable .opener'),
        accordion = new Accordion(openers);
    }
  );
}());
