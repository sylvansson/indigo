#version 300 es

precision lowp float;

in vec2 v_texcoord;

in vec2 v_relativeScreenCoords;

in float v_lightType;
in float v_lightAttenuation;
in vec2 v_lightPosition;
in vec3 v_lightColor;
in float v_lightRotation;
in float v_lightAngle;

uniform sampler2D u_texture_game_albedo;
uniform sampler2D u_texture_game_normal;
uniform sampler2D u_texture_game_specular;

out vec4 fragColor;

const float screenGamma = 2.2;

vec4 calculateLight(float lightAmount, vec3 lightDir, float specularAmount, float shinyAmount, float lightHeight, vec4 specularTexture, vec4 normalTexture, float alpha) {
  float shininess = shinyAmount * ((specularTexture.r + specularTexture.g + specularTexture.b) / 3.0);

  // Normal
  vec3 normalFlipedY = vec3(normalTexture.r, 1.0 - normalTexture.g, normalTexture.b); // Flip Y
  vec3 normal = normalize((2.0f * normalFlipedY) - 1.0f); // Convert RGB 0 to 1, into -1 to 1

  vec3 halfVec = vec3(0.0, 0.0, 1.0);

  float lambertian = max(dot(normal, lightDir), 0.0);

  vec3 reflection = normalize(vec3(2.0 * lambertian) * (normal - lightDir));
  float specular = min(pow(dot(reflection, halfVec), shininess), lambertian) * specularAmount;

  vec4 color = mix(vec4(v_lightColor, lightAmount), vec4(v_lightColor, 1.0), specular);
  vec4 colorGammaCorrected = pow(color, vec4(1.0 / screenGamma));

  return vec4(colorGammaCorrected.rgb, colorGammaCorrected.a * alpha);
}

vec4 calculatePointLight(vec4 specularTexture, vec4 normalTexture, float alpha) {
  float lightAmount = clamp(1.0 - (distance(v_relativeScreenCoords, v_lightPosition) / v_lightAttenuation), 0.0, 1.0);
  float specularAmount = lightAmount * 1.5;
  lightAmount = lightAmount * lightAmount;
  float lightHeight = 1.0; //TODO: Supply.. is light position a vec3 now?!?
  float shinyAmount = 5.0; //TODO: Supply..
  vec3 lightDir = normalize(vec3(v_lightPosition, lightHeight) - vec3(v_relativeScreenCoords, 0.0));

  return calculateLight(lightAmount, lightDir, specularAmount, shinyAmount, lightHeight, specularTexture, normalTexture, alpha);
}

vec4 calculateDirectionLight(vec4 specularTexture, vec4 normalTexture, float alpha) {
  float lightAmount = 0.2; //TODO: Supply..
  float specularAmount = 1.0; //TODO: Supply..
  float lightHeight = 0.0; //TODO: Supply..
  float shinyAmount = 1.0; //TODO: Supply..
  vec3 lightDir = normalize(vec3(sin(v_lightRotation), cos(v_lightRotation), 0.1));

  return calculateLight(lightAmount, lightDir, specularAmount, shinyAmount, lightHeight, specularTexture, normalTexture, alpha);
}

vec4 calculateSpotLight(vec4 specularTexture, vec4 normalTexture, float alpha) {
  float lightAmount = clamp(1.0 - (distance(v_relativeScreenCoords, v_lightPosition) / v_lightAttenuation), 0.0, 1.0);
  float specularAmount = lightAmount * 1.5;
  lightAmount = lightAmount * lightAmount;
  float lightHeight = 1.0; //TODO: Supply.. is light position a vec3 now?!?
  float shinyAmount = 5.0; //TODO: Supply..
  vec3 lightDir = normalize(vec3(v_lightPosition, lightHeight) - vec3(v_relativeScreenCoords, 0.0));

  // This nearly works, failed with look at of -20,0
  // Think this is because atan returns a range of
  // -Pi/2 to Pi/2 and it's getting confused at the
  // back edge.
  float near = 10.0;
  float far = 400.0;
  float viewingAngle = (3.142 / 4.0) / 2.0;

  float distanceToLight = distance(v_relativeScreenCoords, v_lightPosition);

  vec4 finalColor = vec4(0.0);

  if(distanceToLight > near && distanceToLight < far) {

    vec2 lookAtRelativeToLight = vec2(20.0, 0.0); // -20, 0 doesn't work.
    float angleToLookAt = atan(lookAtRelativeToLight.y, lookAtRelativeToLight.x);

    vec2 pixelRelativeToLight = v_relativeScreenCoords - v_lightPosition;
    float angleToPixel = atan(pixelRelativeToLight.y, pixelRelativeToLight.x);

    float relativeAngle = abs(angleToPixel - angleToLookAt);

    if(relativeAngle > -0.01 && relativeAngle < viewingAngle) {
      finalColor = calculateLight(lightAmount, lightDir, specularAmount, shinyAmount, lightHeight, specularTexture, normalTexture, alpha);
    }

  }

  return finalColor;
}

void main(void) {

  float alpha = texture(u_texture_game_albedo, v_texcoord).a;
  vec4 specularTexture = texture(u_texture_game_specular, v_texcoord);
  vec4 normalTexture = texture(u_texture_game_normal, v_texcoord);

  vec4 lightColor = vec4(0.0);

  if(v_lightType == 1.0) {
    lightColor = calculatePointLight(specularTexture, normalTexture, alpha);
  }

  if(v_lightType == 2.0) {
    lightColor = calculateDirectionLight(specularTexture, normalTexture, alpha);
  }

  if(v_lightType == 3.0) {
    lightColor = calculateSpotLight(specularTexture, normalTexture, alpha);
  }

  if(normalTexture.rgb == vec3(0.0)) {
    lightColor = vec4(0.0);
  }

  fragColor = lightColor;
}
