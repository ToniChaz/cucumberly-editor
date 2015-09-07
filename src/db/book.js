class BookDb {

  constructor() {
    //this.db =  new Nedb({
    //  filename: require('path').join(require('nw.gui').App.dataPath, 'cucumberly.db'), // TODO use the no browser version instead LocalStorage
    //  autoload: true
    //});
    this.db =  new Nedb({
      filename: 'cucumberly',
      autoload: true
    });
  }

  loadBook(callback) {
    this.db.findOne({}, (err, bookDb) => {
      if (err) return callback(err);

      if (bookDb) {
        this.book = bookDb;
        callback(null, this.book);

      } else {
        console.log('Book not found, creating...');
        let defaultBook = {title: '', description: '', episodes: []};
        this.db.insert(defaultBook, (err, bookDb) => {
          if (err) return callback(err);
          this.book = bookDb;
          callback(null, this.book);
        });
      }
    });
  }

  updateBook(data, callback) {
    this.book.title = data.title;
    this.book.description = data.description;
    this._saveBook(callback);
  }

  //
  // Episodes
  //

  createEpisode(callback) {
    let newEpisode = {
      id: this._generateId(), name: 'Episode name', features: [], tags:[]
    };
    this.book.episodes.push(newEpisode);
    this._saveBook((err) => {
      if (err) return callback(err);
      callback(null, newEpisode);
    });
  }

  updateEpisode(episodeId, data, callback) {
    this._getEpisode(episodeId, (err, episode) => {
      if (err) return callback(err);

      episode.name = data.name;

      this._saveBook((err) => {
        if (err) return callback(err);
        callback(null, episode);
      });
    });
  }

  removeEpisode(episodeId, callback) {
    _.remove(this.book.episodes, {id: episodeId});
    this._saveBook(callback);
  }

  //
  // Features
  //

  getFeature(episodeId, featureId, callback) {
    this.loadBook((err) => {
      if (err) return callback(err);

      this._getEpisode(episodeId, (err, episode) => {
        if (err) return callback(err);

        let feature = _.find(episode.features, {id: featureId});
        if (!feature) return callback(new Error('Feature not found'));

        callback(null, feature);
      });
    });
  }

  createFeature(episodeId, callback) {
    this._getEpisode(episodeId, (err, episode) => {
      if (err) return callback(err);

      let newFeature = {id: this._generateId(), name: 'Feature name', description: {}, scenarios: []};
      episode.features.push(newFeature);

      this._saveBook((err) => {
        if (err) return callback(err);
        callback(null, newFeature);
      });
    });
  }

  updateFeature(episodeId, featureId, data, callback) {
    this.getFeature(episodeId, featureId, (err, feature) => {
      if (err) return callback(err);

      feature.name = data.name;
      feature.description = data.description;

      this._saveBook((err) => {
        if (err) return callback(err);
        callback(null, feature);
      });
    });
  }

  removeFeature(episodeId, featureId, callback) {
    this._getEpisode(episodeId, (err, episode) => {
      if (err) return callback(err);

      _.remove(episode.features, {id: featureId});
      this._saveBook(callback);
    });
  }

  //
  // Scenarios
  //

  createScenario(episodeId, featureId, data, callback) {
    this.getFeature(episodeId, featureId, (err, feature) => {
      if (err) return callback(err);

      let newScenario = {id: this._generateId(), name: data.name, steps: data.steps, ci: {status: this.CI_STATUS.NONE}};
      feature.scenarios.push(newScenario);
      this._saveBook((err) => {
        if (err) return callback(err);
        callback(null, newScenario);
      });
    });
  }

  updateScenario(episodeId, featureId, scenarioId, data, callback) {
    this.getFeature(episodeId, featureId, (err, feature) => {
      if (err) return callback(err);

      let scenario = _.find(feature.scenarios, {id: scenarioId});
      if (!scenario) return callback(new Error('Scenario not found'));

      scenario.name = data.name;
      scenario.steps = data.steps;

      this._saveBook((err) => {
        if (err) return callback(err);
        callback(null, scenario);
      });
    });
  }

  removeScenario(episodeId, featureId, scenarioId, callback) {
    this.getFeature(episodeId, featureId, (err, feature) => {
      if (err) return callback(err);

      _.remove(feature.scenarios, {id: scenarioId});
      this._saveBook(callback);
    });
  }

  _generateId() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();
  }

  _getEpisode(episodeId, callback) {
    let episode = _.find(this.book.episodes, {id: episodeId});
    if (!episode) return callback(new Error('Episode not found'));
    callback(null, episode);
  }

  _saveBook(callback) {
    this.db.update({_id: this.book._id}, this.book, (err, numReplaced) => {
      if (err) return callback(err);
      if (numReplaced !== 1) return callback(new Error('Error updating book'));

      // https://github.com/louischatriot/nedb#compacting-the-database
      //    Under the hood, NeDB's persistence uses an append-only format, meaning that all updates and deletes actually result in lines added at the end of the datafile.
      // in order to simplify the db data edition, we compact the data file after each operation
      this.db.persistence.compactDatafile();

      callback(null);
    });
  }

}
