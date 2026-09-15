/* global d3, topojson */
(function () {
  'use strict';

  var mount = document.getElementById('map');
  var dataEl = document.getElementById('map-data');
  if (!mount || !dataEl) return;

  var data = JSON.parse(dataEl.textContent);
  // The app may be mounted under a subpath, so every URL the browser builds
  // needs the same prefix the server-rendered links carry.
  var base = data.basePath || '';
  var byNumeric = new Map();
  data.countries.forEach(function (c) {
    if (c.numeric) byNumeric.set(String(Number(c.numeric)), c);
  });

  // Adventure count drives the fill, so somewhere visited ten times reads
  // darker than somewhere visited once.
  var maxCount = d3.max(data.countries, function (c) { return c.adventures.length; }) || 1;
  var colour = d3.scaleSequential()
    .domain([0, maxCount])
    .interpolator(d3.interpolate('#dbeafe', '#1d4ed8'));

  var width = 960;
  var height = 500;

  var svg = d3.select(mount).append('svg')
    .attr('viewBox', '0 0 ' + width + ' ' + height)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  var g = svg.append('g');

  var projection = d3.geoNaturalEarth1().scale(175).translate([width / 2, height / 2]);
  var path = d3.geoPath(projection);

  var detail = document.getElementById('country-detail');

  d3.json(base + '/world-50m.json').then(function (world) {
    var countries = topojson.feature(world, world.objects.countries).features;

    g.selectAll('path.country')
      .data(countries)
      .join('path')
      .attr('class', 'country')
      .attr('d', path)
      .attr('fill', function (d) {
        var hit = byNumeric.get(String(Number(d.id)));
        return hit ? colour(hit.adventures.length) : 'var(--map-empty, #e9edf2)';
      })
      .attr('data-visited', function (d) { return byNumeric.has(String(Number(d.id))) ? 'yes' : 'no'; })
      .style('cursor', function (d) { return byNumeric.has(String(Number(d.id))) ? 'pointer' : 'default'; })
      .on('click', function (event, d) {
        var hit = byNumeric.get(String(Number(d.id)));
        if (hit) showCountry(hit);
      })
      .append('title')
      .text(function (d) {
        var hit = byNumeric.get(String(Number(d.id)));
        if (!hit) return d.properties && d.properties.name ? d.properties.name : '';
        return hit.name + ' — ' + hit.adventures.length + ' adventure' + (hit.adventures.length === 1 ? '' : 's');
      });

    svg.call(
      d3.zoom()
        .scaleExtent([1, 12])
        .on('zoom', function (event) {
          g.attr('transform', event.transform);
          g.attr('stroke-width', 0.5 / event.transform.k);
        })
    );
  }).catch(function (err) {
    mount.innerHTML = '<p class="empty">The map could not be loaded.</p>';
    console.error('map:', err);
  });

  document.querySelectorAll('.country-chip').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var hit = data.countries.find(function (c) { return c.code === btn.dataset.code; });
      if (hit) showCountry(hit);
    });
  });

  function showCountry(country) {
    if (!detail) return;
    detail.hidden = false;
    detail.replaceChildren();

    var h = document.createElement('h2');
    h.textContent = country.name;
    detail.appendChild(h);

    var ul = document.createElement('ul');
    ul.className = 'detail-list';
    country.adventures.forEach(function (a) {
      var li = document.createElement('li');

      var title = document.createElement('strong');
      title.textContent = a.name;
      li.appendChild(title);

      var bits = [];
      if (a.type) bits.push(a.type);
      if (a.date) bits.push(a.date);
      if (!a.done) bits.push('not yet done');
      if (bits.length) {
        var meta = document.createElement('span');
        meta.className = 'meta';
        meta.textContent = ' · ' + bits.join(' · ');
        li.appendChild(meta);
      }

      if (a.description) {
        var p = document.createElement('p');
        p.textContent = a.description;
        li.appendChild(p);
      }

      if (a.photos && a.photos.length) {
        var strip = document.createElement('div');
        strip.className = 'photo-strip';
        a.photos.forEach(function (filename) {
          var img = document.createElement('img');
          img.src = base + '/photos/' + filename;
          img.alt = a.name;
          img.loading = 'lazy';
          strip.appendChild(img);
        });
        li.appendChild(strip);
      }

      ul.appendChild(li);
    });

    detail.appendChild(ul);
    if (typeof detail.scrollIntoView === 'function') {
      detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
})();
