import L from "leaflet";

if (L.Marker) {
  const proto_initIcon = L.Marker.prototype._initIcon;
  const proto_setPos = L.Marker.prototype._setPos;

  L.Marker.addInitHook(function () {
    const iconOptions = this.options.icon && this.options.icon.options;
    const iconAnchor = iconOptions && iconOptions.iconAnchor;
    this.options.rotationOrigin =
      this.options.rotationOrigin || (iconAnchor ? `${iconAnchor[0]}px ${iconAnchor[1]}px` : "center bottom");
    this.options.rotationAngle = this.options.rotationAngle || 0;
  });

  L.Marker.include({
    _initIcon() {
      proto_initIcon.call(this);
    },

    _setPos(pos) {
      proto_setPos.call(this, pos);
      if (this.options.rotationAngle) {
        this._icon.style.transform += ` rotate(${this.options.rotationAngle}deg)`;
      }
    },
  });
}
